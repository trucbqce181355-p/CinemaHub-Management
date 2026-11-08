package com.example.cinemahub.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalTime;

@Data
public class AutoGenerateShowtimesRequest {
    private String movieId;
    private String cinemaId;
    private String roomId;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate startDate;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate endDate;

    @JsonFormat(pattern = "HH:mm")
    private LocalTime dailyStartTime = LocalTime.of(9, 0);

    @JsonFormat(pattern = "HH:mm")
    private LocalTime dailyEndTime = LocalTime.of(23, 30);

    private int breakMinutes = 15;

    private Double basePrice;
}

