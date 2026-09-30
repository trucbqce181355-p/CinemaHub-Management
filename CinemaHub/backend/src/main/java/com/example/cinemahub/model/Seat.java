package com.example.cinemahub.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document(collection = "seats")
public class Seat {
    @Id
    private String id;
    
    private String roomId;
    private String row;
    private Integer col;
    private String seatNumber; // e.g. A1, A2
    
    // STANDARD, VIP, COUPLE, ACCESSIBLE
    private String seatType;
    
    // ACTIVE, MAINTENANCE, DISABLED
    private String status;
}
