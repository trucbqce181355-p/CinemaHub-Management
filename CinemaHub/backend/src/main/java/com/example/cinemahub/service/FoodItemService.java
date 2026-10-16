package com.example.cinemahub.service;

import com.example.cinemahub.dto.FoodItemRequest;
import com.example.cinemahub.model.FoodItem;
import com.example.cinemahub.repository.FoodItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class FoodItemService {

    private final FoodItemRepository foodItemRepository;

    
    public FoodItem createFoodItem(FoodItemRequest request) {
        FoodItem item = FoodItem.builder()
                .name(request.getName())
                .description(request.getDescription())
                .category(request.getCategory())
                .basePrice(request.getBasePrice())
                .imageUrl(request.getImageUrl())
                .attributes(request.getAttributes())
                .isCombo(false)
                .active(true)
                .build();
        return foodItemRepository.save(item);
    }


    public FoodItem createCombo(FoodItemRequest request) {
        FoodItem combo = FoodItem.builder()
                .name(request.getName())
                .description(request.getDescription())
                .category("COMBO")
                .basePrice(request.getBasePrice())
                .imageUrl(request.getImageUrl())
                .comboItems(request.getComboItems())
                .attributes(request.getAttributes())
                .isCombo(true)
                .active(true)
                .build();
        return foodItemRepository.save(combo);
    }

    
    public List<FoodItem> getActiveFoodItems() {
        return foodItemRepository.findByActiveTrue();
    }

   
    public FoodItem getFoodItemById(String id) {
        return foodItemRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Food item not found with id: " + id));
    }

    public FoodItem updateFoodItem(String id, FoodItemRequest request) {
        FoodItem existing = getFoodItemById(id);
        existing.setName(request.getName());
        existing.setDescription(request.getDescription());
        existing.setCategory(request.getCategory());
        existing.setBasePrice(request.getBasePrice());
        existing.setImageUrl(request.getImageUrl());
        if (request.getAttributes() != null) {
            existing.setAttributes(request.getAttributes());
        }
        if (Boolean.TRUE.equals(existing.getIsCombo()) && request.getComboItems() != null) {
            existing.setComboItems(request.getComboItems());
        }
        return foodItemRepository.save(existing);
    }

   
    public FoodItem toggleActiveStatus(String id, Boolean active) {
        FoodItem existing = getFoodItemById(id);
        existing.setActive(active != null ? active : !existing.getActive());
        return foodItemRepository.save(existing);
    }

    
    public FoodItem configureAttributes(String id, Map<String, Object> attributes) {
        FoodItem existing = getFoodItemById(id);
        existing.setAttributes(attributes);
        return foodItemRepository.save(existing);
    }
}