package com.example.cinemahub.model;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/** Embedded in Booking so payment and seat-hold state change atomically. */
@Data
public class Payment {
    private String transactionId;
    @org.springframework.data.mongodb.core.mapping.Field(targetType = org.springframework.data.mongodb.core.mapping.FieldType.DECIMAL128)
    private BigDecimal amount;
    private String currency = "VND";
    private String provider = "VNPAY";
    private String status = "PENDING";
    private String checkoutUrl;
    private String providerTransactionId;
    private String responseCode;
    private boolean reconciliationRequired;
    private LocalDateTime createdAt;
    private LocalDateTime expiresAt;
    private LocalDateTime updatedAt;
}
