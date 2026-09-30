package com.example.cinemahub.repository;

import com.example.cinemahub.model.Seat;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SeatRepository extends MongoRepository<Seat, String> {
    List<Seat> findByRoomId(String roomId);
    void deleteByRoomId(String roomId);
}
