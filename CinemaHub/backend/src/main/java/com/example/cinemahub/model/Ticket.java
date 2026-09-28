package com.example.cinemahub.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import jakarta.validation.constraints.NotBlank;
import java.util.List;

@Data
@Document(collection = "tickets")
public class Ticket {
    @Id
    private String id;
    
    @NotBlank(message = "Mã đặt chỗ không được để trống")
    private String bookingReference;
    
    @NotBlank(message = "ID suất chiếu không được để trống")
    private String showtimeId;
    
    private String cinemaId;
    private String roomId;
    private List<SeatStatus> seats;
    
    @NotBlank(message = "Trạng thái vé không được để trống")
    private String status;
    
    @Data
    public static class SeatStatus {
        private String seatId;
        private String seatNumber;
        private String usageStatus;
        private ScanMetadata scanMetadata;
    }
    
    @Data
    public static class ScanMetadata {
        private String scannedAt;
        private String scannedByGate;
    }
}
