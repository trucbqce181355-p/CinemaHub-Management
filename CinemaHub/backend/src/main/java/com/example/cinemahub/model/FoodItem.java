package com.example.cinemahub.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "food_items")
public class FoodItem {
    @Id
    private String id;
    
    private String name;
    private String description;
    private String category; 
    private Double basePrice;
    private String imageUrl;
    
    
    private Map<String, Object> attributes;
   
    private List<ComboItemDetail> comboItems;
    
    private Boolean isCombo;
    
    @Builder.Default
    private Boolean active = true; 

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ComboItemDetail {
        private String foodItemId;
        private String itemName;
        private Integer quantity;
    }
}