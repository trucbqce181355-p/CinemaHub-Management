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
@Document(collection = "point_transactions")
public class PointTransaction {
    @Id
    private String id;

    private String userId;
    private String userEmail;
    private String userName;

    // Type: EARN (from booking), REDEEM (for voucher), ADJUSTMENT (manual staff edit), BONUS, REFUND
    private String type;

    // Points delta (+100 or -50)
    private Integer points;

    // Running point balance after this transaction
    private Integer balanceAfter;

    // Reason / Note
    private String reason;

    // Reference ID (booking reference, ticket ID, or reward voucher ID)
    private String referenceId;

    // Staff / Admin ID who made the adjustment, or "SYSTEM"
    private String adjustedBy;

    // Staff / Admin display name
    private String adjustedByName;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
