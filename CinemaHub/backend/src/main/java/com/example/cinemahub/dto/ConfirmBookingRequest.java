package com.example.cinemahub.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ConfirmBookingRequest {
    @NotBlank(message = "Phương thức thanh toán không được để trống")
    private String paymentMethod; // MOMO, VNPAY, CARD, CASH

    private String customerName;
    private String customerEmail;
    private String customerPhone;
    private String promoCode;
}
