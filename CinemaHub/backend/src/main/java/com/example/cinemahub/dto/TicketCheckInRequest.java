package com.example.cinemahub.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TicketCheckInRequest(@NotBlank @Size(max = 512) String code,
                                   @NotBlank @Size(max = 128) String expectedShowtimeId) {
}
