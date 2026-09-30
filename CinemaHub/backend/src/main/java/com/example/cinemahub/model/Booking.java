package com.example.cinemahub.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "bookings")
public class Booking {
    @Id
    private String id;

    private String bookingReference;

    private String userId; // Optional for guests
    private String customerName;
    private String customerEmail;
    private String customerPhone;

    private String showtimeId;
    private String movieId;
    private String movieTitle;
    private String moviePoster;

    private String cinemaId;
    private String cinemaName;

    private String roomId;
    private String roomName;

    private LocalDateTime showtimeStart;
    private String showtimeFormat;

    @Builder.Default
    private List<BookedSeat> seats = new ArrayList<>();

    private Double subtotal;
    private String promoCode;
    private Double discountAmount;
    private Double totalAmount;

    // PENDING, CONFIRMED, CANCELLED, EXPIRED
    private String status;

    // Temporary seat hold deadline (e.g. 10 minutes)
    private LocalDateTime holdExpiresAt;

    private String paymentMethod; // CASH, CARD, MOMO, VNPAY
    private String bookingType;   // ONLINE, COUNTER
    private String counterStaffId;
    private String notes;

    private String ticketId;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BookedSeat {
        private String seatId;       // e.g. A1, C5
        private String seatNumber;   // e.g. A1, C5
        private String seatType;     // STANDARD, VIP, COUPLE
        private Double price;
    }
}
