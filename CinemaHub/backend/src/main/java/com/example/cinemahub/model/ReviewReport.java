package com.example.cinemahub.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "review_reports")
public class ReviewReport {
    @Id
    private String id;

    private String reviewId;
    private String movieId;
    private String reporterUserId;
    private String reporterUserName;
    private String reporterEmail;

    // INAPPROPRIATE_LANGUAGE, SPAM, SPOILER, HARASSMENT, OTHER
    private String reason;
    private String description;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
