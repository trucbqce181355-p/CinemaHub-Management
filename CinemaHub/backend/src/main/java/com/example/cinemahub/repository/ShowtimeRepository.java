package com.example.cinemahub.repository;

import com.example.cinemahub.model.Showtime;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ShowtimeRepository extends MongoRepository<Showtime, String> {
    List<Showtime> findByRoomId(String roomId);
    List<Showtime> findByMovieId(String movieId);
    List<Showtime> findByCinemaId(String cinemaId);
    List<Showtime> findByMovieIdAndCinemaId(String movieId, String cinemaId);
    List<Showtime> findByStartTimeBetween(LocalDateTime start, LocalDateTime end);
    List<Showtime> findByMovieIdAndStartTimeBetween(String movieId, LocalDateTime start, LocalDateTime end);
}