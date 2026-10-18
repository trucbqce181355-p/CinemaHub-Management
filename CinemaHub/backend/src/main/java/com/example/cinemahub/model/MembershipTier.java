package com.example.cinemahub.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "membership_tiers")
public class MembershipTier {
    @Id
    private String id;

    // Unique code: BRONZE, SILVER, GOLD, PLATINUM
    private String code;

    // Display Name: e.g. "Thành viên Chuẩn", "Thành viên Bạc", "Thành viên Vàng", "Thành viên Bạch Kim"
    private String name;

    // Hierarchy level (1 = lowest, 4 = highest)
    private Integer level;

    // Points required to reach/maintain this tier
    private Integer minPoints;

    // Optional minimum total spend requirement (VND)
    private Double minSpend;

    // Earning multiplier for ticket purchases (e.g. 1.0, 1.2, 1.5, 2.0)
    @Builder.Default
    private Double pointsMultiplier = 1.0;

    // Direct discount percent on movie tickets (e.g. 0%, 5%, 10%, 15%)
    @Builder.Default
    private Double ticketDiscountPercent = 0.0;

    // Discount percent on Food & Beverage / Concessions (e.g. 0%, 5%, 10%, 15%)
    @Builder.Default
    private Double fnbDiscountPercent = 0.0;

    // Birthday gift benefit (e.g. "1 Bắp ngọt", "Combo Bắp + Nước", "1 Vé 2D + Combo Bắp Nước")
    private String birthdayGift;

    // Visual badge color or gradient (e.g. "#CD7F32", "#94A3B8", "#EAB308", "#A855F7")
    private String badgeColor;

    // Status: "Active", "Inactive"
    @Builder.Default
    private String status = "Active";

    // Detailed bullet points of perks
    @Builder.Default
    private List<String> benefits = new ArrayList<>();

    private String description;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
