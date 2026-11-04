package com.example.cinemahub.service;

import com.example.cinemahub.model.Showtime;
import com.example.cinemahub.repository.MovieRepository;
import com.example.cinemahub.repository.ShowtimeRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class ScreeningActivityService {
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private final ShowtimeRepository showtimes;
    private final MovieRepository movies;
    private Clock clock = Clock.systemDefaultZone();

    public ScreeningActivityService(ShowtimeRepository showtimes, MovieRepository movies) {
        this.showtimes = showtimes;
        this.movies = movies;
    }

    // Call inside AdmissionCoordinator.write, before changing the cinema/room.
    public void assertCinemaCanDisable(String cinemaId) {
        assertNoOngoingScreening(showtimes.findByCinemaId(cinemaId), "cụm rạp");
    }

    public void assertRoomCanDisable(String roomId) {
        assertNoOngoingScreening(showtimes.findByRoomId(roomId), "phòng chiếu");
    }

    private void assertNoOngoingScreening(List<Showtime> screenings, String target) {
        LocalDateTime now = LocalDateTime.now(clock);
        for (Showtime screening : screenings) {
            if (!"Active".equalsIgnoreCase(screening.getStatus())) continue;
            LocalDateTime start = screening.getStartTime();
            if (start == null) {
                throw invalidTime(target, "thiếu giờ bắt đầu");
            }
            if (now.isBefore(start)) continue;
            LocalDateTime end = screening.getEndTime();
            // Older screenings may not have a stored end time. Use their movie's duration.
            if (end == null && screening.getMovieId() != null) {
                Integer duration = movies.findById(screening.getMovieId())
                        .map(movie -> movie.getDuration()).orElse(null);
                if (duration != null && duration > 0) end = start.plusMinutes(duration);
            }
            if (end == null || !end.isAfter(start)) {
                throw invalidTime(target, "thiếu hoặc sai giờ kết thúc");
            }
            // Start is inclusive; disabling is allowed exactly at the end time.
            if (now.isBefore(end)) {
                String movie = hasText(screening.getMovieTitle()) ? screening.getMovieTitle() : "chưa cập nhật tên";
                String room = hasText(screening.getRoomName()) ? screening.getRoomName() : "chưa cập nhật tên phòng";
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Không thể ngưng hoạt động " + target + " vì phim \"" + movie + "\" tại phòng " + room
                        + " đang chiếu từ " + TIME.format(start) + " đến " + TIME.format(end)
                        + ". Vui lòng chờ suất chiếu kết thúc.");
            }
        }
    }

    private ResponseStatusException invalidTime(String target, String reason) {
        return new ResponseStatusException(HttpStatus.CONFLICT,
                "Không thể ngưng hoạt động " + target + " vì có suất chiếu còn hiệu lực " + reason
                + ". Vui lòng kiểm tra và cập nhật thời gian suất chiếu.");
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
