package com.example.cinemahub.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDateTime;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

@Data
@Document(collection = "tickets")
public class Ticket {
    @Id
    private String id;
    
    @NotBlank(message = "Mã đặt chỗ không được để trống")
    private String bookingReference;

    private String bookingId;
    
    @NotBlank(message = "ID suất chiếu không được để trống")
    private String showtimeId;
    
    private String cinemaId;
    private String roomId;
    private String customerName;
    private String movieTitle;
    private LocalDateTime showtimeStart;

    private List<SeatStatus> seats;
    
    @NotBlank(message = "Trạng thái vé không được để trống")
    private String status; // Paid, Cancelled, Used

    private String qrCode;

    private LocalDateTime createdAt = LocalDateTime.now();
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SeatStatus {
        private String seatId;
        private String seatNumber;
        private String usageStatus; // Unused, Used
        private ScanMetadata scanMetadata;

        public SeatStatus(String seatId, String seatNumber, String usageStatus) {
            this.seatId = seatId;
            this.seatNumber = seatNumber;
            this.usageStatus = usageStatus;
        }
    }
    
    @Data
    public static class ScanMetadata {
        private String scannedAt;
        private String scannedByGate;
    }
}
