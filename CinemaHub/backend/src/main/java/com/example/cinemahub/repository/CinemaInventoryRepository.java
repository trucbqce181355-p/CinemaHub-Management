package com.example.cinemahub.repository;

import com.example.cinemahub.model.CinemaInventory;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;
import java.util.Optional;

public interface CinemaInventoryRepository extends MongoRepository<CinemaInventory, String> {
    Optional<CinemaInventory> findByCinemaIdAndFoodItemId(String cinemaId, String foodItemId);
    List<CinemaInventory> findByCinemaId(String cinemaId);
    List<CinemaInventory> findByCinemaIdAndIsAvailableTrue(String cinemaId);
}