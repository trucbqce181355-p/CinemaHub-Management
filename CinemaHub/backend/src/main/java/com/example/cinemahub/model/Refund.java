package com.example.cinemahub.model;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/** One full refund per booking. Kept with payment for atomic conditional transitions. */
@Data
public class Refund {
    private String id;
    private String status;
    @org.springframework.data.mongodb.core.mapping.Field(targetType = org.springframework.data.mongodb.core.mapping.FieldType.DECIMAL128)
    private BigDecimal amount;
    private String reason;
    private String requestedBy;
    private LocalDateTime requestedAt;
    private String decidedBy;
    private String decisionReason;
    private LocalDateTime decidedAt;
    private LocalDateTime processingAt;
    private String providerCode;
    private String providerTransactionId;
    private boolean effectsApplied;
    private List<Event> audit = new ArrayList<>();

    public record Event(String status, String actor, LocalDateTime at, String code) {}

    public static boolean blocksAdmission(Refund refund) {
        return refund != null && !"REJECTED".equals(refund.getStatus());
    }
}
