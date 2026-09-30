package com.example.cinemahub.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import java.util.List;

@Data
public class HoldSeatRequest {
    @NotBlank(message = "ID suất chiếu không được để trống")
    private String showtimeId;

    @NotEmpty(message = "Vui lòng chọn ít nhất một ghế")
    private List<String> seatIds;

    private String customerName;
    private String customerEmail;
    private String customerPhone;
}
