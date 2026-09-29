package com.example.cinemahub.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
public class CalculatePriceRequest {
    @NotBlank(message = "ID suất chiếu không được để trống")
    private String showtimeId;

    @NotEmpty(message = "Vui lòng chọn ít nhất một ghế")
    private List<String> seatIds;

    private String promoCode;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PriceResult {
        private Double subtotal;
        private Double discountAmount;
        private Double totalAmount;
        private String promoCode;
        private String promoTitle;
        private List<SeatPriceItem> seats;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SeatPriceItem {
        private String seatId;
        private String seatNumber;
        private String seatType;
        private Double price;
    }
}
