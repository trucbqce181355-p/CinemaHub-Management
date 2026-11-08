package com.example.cinemahub.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "cinema_inventories")
public class CinemaInventory {
    @Id
    private String id;
    private String cinemaId;
    private String foodItemId;
    private Integer stockQuantity;
    private Boolean isAvailable;

    public CinemaInventory() {}

    public CinemaInventory(String cinemaId, String foodItemId, Integer stockQuantity) {
        this.cinemaId = cinemaId;
        this.foodItemId = foodItemId;
        this.stockQuantity = stockQuantity;
        this.isAvailable = stockQuantity != null && stockQuantity > 0;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getCinemaId() { return cinemaId; }
    public void setCinemaId(String cinemaId) { this.cinemaId = cinemaId; }

    public String getFoodItemId() { return foodItemId; }
    public void setFoodItemId(String foodItemId) { this.foodItemId = foodItemId; }

    public Integer getStockQuantity() { return stockQuantity; }
    public void setStockQuantity(Integer stockQuantity) {
        this.stockQuantity = stockQuantity;
        this.isAvailable = (stockQuantity != null && stockQuantity > 0);
    }

    public Boolean getIsAvailable() { return isAvailable; }
    public void setIsAvailable(Boolean isAvailable) { this.isAvailable = isAvailable; }
}