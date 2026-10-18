package com.example.cinemahub.repository;

import com.example.cinemahub.model.FoodItem;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FoodItemRepository extends MongoRepository<FoodItem, String> {
    List<FoodItem> findByActiveTrue();
    List<FoodItem> findByCategory(String category);
    List<FoodItem> findByIsComboTrueAndActiveTrue();
}