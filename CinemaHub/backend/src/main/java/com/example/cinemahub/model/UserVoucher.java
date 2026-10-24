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
@Document(collection = "user_vouchers")
public class UserVoucher {
    @Id
    private String id;

    private String userId;
    private String userEmail;

    // The reward template id
    private String rewardVoucherId;

    // Generated coupon promo code (e.g. "RDM-7K9A2F")
    private String code;

    private String title;
    private String discountType;
    private Double discountValue;
    private Double minSpend;

    private LocalDateTime expiresAt;

    // Status: UNUSED, USED, EXPIRED
    @Builder.Default
    private String status = "UNUSED";

    @Builder.Default
    private LocalDateTime redeemedAt = LocalDateTime.now();

    private LocalDateTime usedAt;
    private String usedBookingId;
}
