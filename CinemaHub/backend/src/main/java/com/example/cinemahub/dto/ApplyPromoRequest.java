package com.example.cinemahub.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
public class ApplyPromoRequest {
    @NotBlank(message = "Mã khuyến mãi không được để trống")
    private String code;

    @NotNull(message = "Tạm tính không được để trống")
    @Min(value = 0, message = "Tạm tính phải >= 0")
    private Double subtotal;

    private String bookingId;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PromoResult {
        private String code;
        private String title;
        private String discountType;
        private Double discountValue;
        private Double discountAmount;
        private Double newTotal;
    }
}
