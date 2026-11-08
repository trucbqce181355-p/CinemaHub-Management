package com.example.cinemahub.model;

import lombok.Data;
import java.time.LocalDateTime;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/** Created only by a real ticket/refund event. Never populated by a seed. */
@Data
@Document(collection = "payment_email_jobs")
public class EmailJob {
    @Id private String id;
    private String bookingId;
    private String ticketId;
    private String kind;
    private String recipient;
    private String status = "PENDING";
    private int attempts;
    private String lastError;
    private LocalDateTime nextAttemptAt = LocalDateTime.now();
    private LocalDateTime leaseUntil;
    private String leaseToken;
    private LocalDateTime sentAt;
}
