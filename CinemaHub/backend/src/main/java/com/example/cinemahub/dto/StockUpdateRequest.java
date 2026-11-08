package com.example.cinemahub.dto;

public class StockUpdateRequest {
    private String cinemaId;
    private String foodItemId;
    private Integer newStock;

    public StockUpdateRequest() {}

    public String getCinemaId() { return cinemaId; }
    public void setCinemaId(String cinemaId) { this.cinemaId = cinemaId; }

    public String getFoodItemId() { return foodItemId; }
    public void setFoodItemId(String foodItemId) { this.foodItemId = foodItemId; }

    public Integer getNewStock() { return newStock; }
    public void setNewStock(Integer newStock) { this.newStock = newStock; }
}