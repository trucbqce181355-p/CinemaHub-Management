package com.example.cinemahub.repository;

import com.example.cinemahub.model.Showtime;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface ShowtimeRepository extends MongoRepository<Showtime, String> {
    List<Showtime> findByRoomId(String roomId);
    List<Showtime> findByMovieId(String movieId);
}
