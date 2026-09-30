package com.example.cinemahub.service;

import com.example.cinemahub.model.Movie;
import com.example.cinemahub.model.Showtime;
import com.example.cinemahub.repository.MovieRepository;
import com.example.cinemahub.repository.ShowtimeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ShowtimeService {

    @Autowired
    private ShowtimeRepository showtimeRepository;

    @Autowired
    private MovieRepository movieRepository;

    public List<Showtime> searchShowtimes(String movieId, String roomId) {
        List<Showtime> all = showtimeRepository.findAll();
        if (movieId != null && !movieId.isEmpty()) {
            all = all.stream().filter(s -> movieId.equals(s.getMovieId())).collect(Collectors.toList());
        }
        if (roomId != null && !roomId.isEmpty()) {
            all = all.stream().filter(s -> roomId.equals(s.getRoomId())).collect(Collectors.toList());
        }
        return all;
    }

    public Showtime getShowtimeById(String id) {
        return showtimeRepository.findById(id).orElse(null);
    }

    public Showtime createShowtime(Showtime showtime) throws Exception {
        validateShowtime(showtime, null);
        if (showtime.getStatus() == null) showtime.setStatus("ACTIVE");
        return showtimeRepository.save(showtime);
    }

    public Showtime updateShowtime(String id, Showtime updated) throws Exception {
        Showtime existing = getShowtimeById(id);
        if (existing == null) throw new Exception("Showtime not found");
        
        validateShowtime(updated, id);
        
        existing.setMovieId(updated.getMovieId());
        existing.setRoomId(updated.getRoomId());
        existing.setStartTime(updated.getStartTime());
        existing.setEndTime(updated.getEndTime());
        if (updated.getStatus() != null) {
            existing.setStatus(updated.getStatus());
        }
        
        return showtimeRepository.save(existing);
    }

    public void deleteShowtime(String id) {
        showtimeRepository.deleteById(id);
    }

    public Showtime updateStatus(String id, String status) throws Exception {
        Showtime existing = getShowtimeById(id);
        if (existing == null) throw new Exception("Showtime not found");
        existing.setStatus(status);
        return showtimeRepository.save(existing);
    }

    private void validateShowtime(Showtime showtime, String currentId) throws Exception {
        Movie movie = movieRepository.findById(showtime.getMovieId())
                .orElseThrow(() -> new Exception("Movie not found"));
        
        if (showtime.getStartTime() == null) {
             throw new Exception("Start time is required");
        }
        
        if (showtime.getStartTime().isBefore(LocalDateTime.now().plusHours(1))) {
             throw new Exception("Thời gian bắt đầu phải lớn hơn hiện tại ít nhất 1 giờ.");
        }
        
        int duration = movie.getDuration() != null ? movie.getDuration() : 120;
        
        // Setup EndTime based on duration + 0 mins (actual movie end)
        showtime.setEndTime(showtime.getStartTime().plusMinutes(duration));
        
        List<Showtime> roomShowtimes = showtimeRepository.findByRoomId(showtime.getRoomId());
        for (Showtime st : roomShowtimes) {
            if (currentId != null && st.getId().equals(currentId)) {
                continue;
            }
            
            if ("DISABLED".equals(st.getStatus())) {
                continue;
            }
            
            LocalDateTime stEnd = st.getEndTime();
            if (stEnd == null) {
                // Fallback in case old data has no end time (assume 2 hours)
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
