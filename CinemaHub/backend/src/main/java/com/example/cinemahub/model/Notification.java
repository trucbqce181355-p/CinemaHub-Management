package com.example.cinemahub.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "notifications")
public class Notification {
    @Id
    private String id;

    // Recipient user ID, or "ALL" for broadcast
    private String userId;

    private String title;

    private String message;

    // SHOWTIME_REMINDER, TICKET_OPENING, BOOKING, PROMOTION, SYSTEM
    private String type;

    private String link;

    @Builder.Default
    private Boolean isRead = false;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    private Map<String, Object> metadata;
}

