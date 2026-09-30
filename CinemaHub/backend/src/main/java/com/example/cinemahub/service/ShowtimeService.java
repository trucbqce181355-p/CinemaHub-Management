package com.example.cinemahub.service;

import com.example.cinemahub.model.Showtime;
import com.example.cinemahub.repository.ShowtimeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ShowtimeService {

    @Autowired
    private ShowtimeRepository showtimeRepository;

    public List<Showtime> getShowtimes(String movieId, String cinemaId, String dateStr, Boolean includePast) {
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
                .filter(s -> "Active".equalsIgnoreCase(s.getStatus()))
                .sorted((a, b) -> a.getStartTime().compareTo(b.getStartTime()))
                .collect(Collectors.toList());
    }

    public List<Showtime> getShowtimes(String movieId, String cinemaId, String dateStr) {
        return getShowtimes(movieId, cinemaId, dateStr, false);
    }

    public Showtime getShowtimeById(String id) {
        return showtimeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy suất chiếu với ID: " + id));
    }

    public Showtime createShowtime(Showtime showtime) {
        if (showtime.getStatus() == null) {
            showtime.setStatus("Active");
        }
        return showtimeRepository.save(showtime);
    }

    public void deleteShowtime(String id) {
        showtimeRepository.deleteById(id);
    }
}
