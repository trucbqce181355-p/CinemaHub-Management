package com.example.cinemahub.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SelectFoodBookingRequest {
    private String bookingId;
    private String cinemaId;
    private List<SelectedFoodItem> items;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SelectedFoodItem {
        private String foodItemId;
        private String name;
        private Double price;
        private Integer quantity;
    }
}
