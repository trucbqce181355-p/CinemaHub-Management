package com.example.cinemahub.dto;

import java.util.List;

public class SelectFoodBookingRequest {
    private String bookingId;
    private String cinemaId;
    private List<SelectedFoodItem> items;

    public static class SelectedFoodItem {
        private String foodItemId;
        private Integer quantity;

        public String getFoodItemId() { return foodItemId; }
        public void setFoodItemId(String foodItemId) { this.foodItemId = foodItemId; }
        public Integer getQuantity() { return quantity; }
        public void setQuantity(Integer quantity) { this.quantity = quantity; }
    }

    public String getBookingId() { return bookingId; }
    public void setBookingId(String bookingId) { this.bookingId = bookingId; }

    public String getCinemaId() { return cinemaId; }
    public void setCinemaId(String cinemaId) { this.cinemaId = cinemaId; }

    public List<SelectedFoodItem> getItems() { return items; }
    public void setItems(List<SelectedFoodItem> items) { this.items = items; }
}