package com.example.cinemahub.dto;

import com.example.cinemahub.model.FoodItem.ComboItemDetail;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
public class FoodItemRequest {
    private String name;
    private String description;
    private String category;
    private Double basePrice;
    private String imageUrl;
    private Map<String, Object> attributes; 
    private List<ComboItemDetail> comboItems; 
    private Boolean isCombo;
    private Boolean active;
}