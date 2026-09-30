package com.example.cinemahub.service;

import com.example.cinemahub.model.Movie;
import com.example.cinemahub.model.Showtime;
import com.example.cinemahub.model.ScreenRoom;
import com.example.cinemahub.repository.MovieRepository;
import com.example.cinemahub.repository.ShowtimeRepository;
import com.example.cinemahub.repository.ScreenRoomRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ShowtimeService {

    @Autowired
    private ShowtimeRepository showtimeRepository;

    @Autowired
    private MovieRepository movieRepository;

    @Autowired
    private ScreenRoomRepository screenRoomRepository;

    public List<Showtime> getShowtimes(String movieId, String cinemaId, String dateStr, Boolean includePast, Boolean allStatuses) {
        List<Showtime> list;
        if (movieId != null && !movieId.isBlank() && cinemaId != null && !cinemaId.isBlank()) {
            list = showtimeRepository.findByMovieIdAndCinemaId(movieId, cinemaId);
        } else if (movieId != null && !movieId.isBlank()) {
            list = showtimeRepository.findByMovieId(movieId);
        } else if (cinemaId != null && !cinemaId.isBlank()) {
            list = showtimeRepository.findByCinemaId(cinemaId);
        } else {
            list = showtimeRepository.findAll();
        }

        if (dateStr != null && !dateStr.isBlank()) {
            try {
                LocalDate filterDate = LocalDate.parse(dateStr);
                list = list.stream().filter(s -> {
                    if (s.getStartTime() == null) return false;
                    return s.getStartTime().toLocalDate().isEqual(filterDate);
                }).collect(Collectors.toList());
            } catch (Exception ignored) {
            }
        }

        // Filter out past showtimes unless includePast is explicitly true
        if (includePast == null || !includePast) {
            LocalDateTime now = LocalDateTime.now();
            list = list.stream().filter(s -> {
                if (s.getStartTime() == null) return false;
                return s.getStartTime().isAfter(now);
            }).collect(Collectors.toList());
        }

        return list.stream()
                .filter(s -> (allStatuses != null && allStatuses) || "Active".equalsIgnoreCase(s.getStatus()))
                .sorted((a, b) -> {
                    if (a.getStartTime() == null || b.getStartTime() == null) return 0;
                    return a.getStartTime().compareTo(b.getStartTime());
                })
                .collect(Collectors.toList());
    }

    public List<Showtime> getShowtimes(String movieId, String cinemaId, String dateStr) {
        return getShowtimes(movieId, cinemaId, dateStr, false, false);
    }

    public Showtime getShowtimeById(String id) {
        return showtimeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy suất chiếu với ID: " + id));
    }

    public Showtime createShowtime(Showtime showtime) throws Exception {
        validateShowtime(showtime, null);
        if (showtime.getStatus() == null) {
            showtime.setStatus("Active");
        }
        return showtimeRepository.save(showtime);
    }

    public Showtime updateShowtime(String id, Showtime updated) throws Exception {
        Showtime existing = getShowtimeById(id);
        
        validateShowtime(updated, id);
        
        existing.setMovieId(updated.getMovieId());
        existing.setMovieTitle(updated.getMovieTitle());
        existing.setMoviePoster(updated.getMoviePoster());
        existing.setCinemaId(updated.getCinemaId());
        existing.setCinemaName(updated.getCinemaName());
        existing.setRoomId(updated.getRoomId());
        existing.setRoomName(updated.getRoomName());
        existing.setStartTime(updated.getStartTime());
        existing.setEndTime(updated.getEndTime());
        existing.setFormat(updated.getFormat());
        existing.setBasePrice(updated.getBasePrice());
        if (updated.getStatus() != null) {
            existing.setStatus(updated.getStatus());
        }
        
        return showtimeRepository.save(existing);
    }

    public Showtime updateStatus(String id, String status) throws Exception {
        Showtime existing = getShowtimeById(id);
        existing.setStatus(status);
        return showtimeRepository.save(existing);
    }

    public void deleteShowtime(String id) {
        showtimeRepository.deleteById(id);
    }

    private void validateShowtime(Showtime showtime, String currentId) throws Exception {
        Movie movie = movieRepository.findById(showtime.getMovieId())
                .orElseThrow(() -> new Exception("Không tìm thấy phim với ID: " + showtime.getMovieId()));
        
        if (showtime.getStartTime() == null) {
             throw new Exception("Thời gian bắt đầu không được để trống");
        }
        
        if (showtime.getStartTime().isBefore(LocalDateTime.now().plusHours(1))) {
             throw new Exception("Thời gian bắt đầu phải lớn hơn hiện tại ít nhất 1 giờ.");
        }
        
        int duration = movie.getDuration() != null ? movie.getDuration() : 120;
        
        // Setup EndTime based on duration
        showtime.setEndTime(showtime.getStartTime().plusMinutes(duration));
        
        // Cập nhật Format (Định Dạng) theo đúng Dạng màn hình của Phòng chiếu (ScreenRoom)
        ScreenRoom room = screenRoomRepository.findById(showtime.getRoomId()).orElse(null);
        if (room != null) {
            showtime.setFormat(room.getScreenType());
        }

        List<Showtime> roomShowtimes = showtimeRepository.findByRoomId(showtime.getRoomId());
        for (Showtime st : roomShowtimes) {
            if (currentId != null && st.getId().equals(currentId)) {
                continue;
            }
            
            if ("CANCELLED".equalsIgnoreCase(st.getStatus()) || "DISABLED".equalsIgnoreCase(st.getStatus())) {
                continue;
            }
            
            LocalDateTime stEnd = st.getEndTime();
            if (stEnd == null) {
                stEnd = st.getStartTime().plusMinutes(120);
            }

            // Add 15 minutes break time
            LocalDateTime existingStart = st.getStartTime().minusMinutes(15);
            LocalDateTime existingEnd = stEnd.plusMinutes(15);
            
            if (showtime.getStartTime().isBefore(existingEnd) && showtime.getEndTime().isAfter(existingStart)) {
                throw new Exception("Trùng lịch chiếu! Phòng này đã có suất chiếu khác trong khoảng thời gian bạn chọn (tính cả 15 phút dọn dẹp). Vui lòng chọn giờ hoặc phòng khác.");
            }
        }
    }
}