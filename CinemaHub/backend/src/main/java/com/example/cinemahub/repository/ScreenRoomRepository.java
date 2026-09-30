package com.example.cinemahub.repository;

import com.example.cinemahub.model.ScreenRoom;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ScreenRoomRepository extends MongoRepository<ScreenRoom, String> {
    List<ScreenRoom> findByCinemaId(String cinemaId);
    ScreenRoom findByNameAndCinemaId(String name, String cinemaId);
}
