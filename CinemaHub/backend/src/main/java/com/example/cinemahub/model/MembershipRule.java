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
@Document(collection = "membership_rules")
public class MembershipRule {
    @Id
    private String id;

    // How many VND spent equals 1 base reward point (Default: 1,000 VND = 1 Point)
    @Builder.Default
    private Integer earnRateVndPerPoint = 1000;

    // How many days before points expire (Default: 365 days / 1 year)
    @Builder.Default
    private Integer pointExpiryDays = 365;

    // Minimum points required for voucher redemption
    @Builder.Default
    private Integer minPointsToRedeem = 500;

    // Rule notes & terms for members
    private String termsAndConditions;

    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
