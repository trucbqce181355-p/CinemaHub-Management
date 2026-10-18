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
@Document(collection = "reward_vouchers")
public class RewardVoucher {
    @Id
    private String id;

    // Title: e.g. "Mã giảm giá 20.000đ", "Mã giảm giá 50.000đ", "Voucher Bắp Nước 45.000đ"
    private String title;

    private String description;

    // Reward points required to redeem
    private Integer pointsRequired;

    // Discount type: FIXED_AMOUNT or PERCENTAGE
    @Builder.Default
    private String discountType = "FIXED_AMOUNT";

    // Value in VND (e.g. 20000.0) or percentage (e.g. 15.0)
    private Double discountValue;

    // Minimum booking spend required to apply this voucher
    @Builder.Default
    private Double minSpend = 0.0;

    // Days voucher will remain valid after redemption (e.g. 30 days)
    @Builder.Default
    private Integer validityDays = 30;

    // Icon tag for UI display: "ticket", "popcorn", "percent", "gift"
    @Builder.Default
    private String icon = "ticket";

    // Status: "Active", "Inactive"
    @Builder.Default
    private String status = "Active";

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
