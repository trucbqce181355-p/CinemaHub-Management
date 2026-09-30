package com.example.cinemahub.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;
import java.util.List;

@Data
public class CounterBookingRequest {
    @NotBlank(message = "ID suất chiếu không được để trống")
    private String showtimeId;

    @NotEmpty(message = "Vui lòng chọn ít nhất một ghế")
    private List<String> seatIds;

    @NotBlank(message = "Tên khách hàng không được để trống")
    private String customerName;

    private String customerPhone;
    private String customerEmail;

    @NotBlank(message = "Phương thức thanh toán không được để trống")
    private String paymentMethod; // CASH, CARD, TRANSFER

    private String promoCode;
    private String staffNotes;
}
