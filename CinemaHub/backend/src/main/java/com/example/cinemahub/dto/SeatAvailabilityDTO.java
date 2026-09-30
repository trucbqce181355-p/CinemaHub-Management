package com.example.cinemahub.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SeatAvailabilityDTO {
    private String showtimeId;
    private String roomId;
    private String roomName;
    private int totalSeats;
    private int availableCount;
    private int heldCount;
    private int bookedCount;
    private List<SeatItem> seats;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SeatItem {
        private String seatId;      // e.g. A1
        private String row;         // e.g. A
        private int col;            // e.g. 1
        private String seatType;    // STANDARD, VIP, COUPLE
        private Double price;
        private String status;      // AVAILABLE, HELD, BOOKED
    }
}
