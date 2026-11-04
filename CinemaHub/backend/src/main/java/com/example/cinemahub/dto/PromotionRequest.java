package com.example.cinemahub.dto;

import com.example.cinemahub.model.Promotion;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import java.util.Map;

public record PromotionRequest(@NotBlank String code, @NotBlank String title, String description,
        @NotBlank String discountType, @NotNull Double discountValue,
        @NotNull LocalDateTime startDate, @NotNull LocalDateTime endDate,
        String status, Map<String, Object> conditions, String bannerImage, Long version) {
    public Promotion promotion() {
        Promotion p = new Promotion();
        p.setCode(code); p.setTitle(title); p.setDescription(description);
        p.setDiscountType(discountType); p.setDiscountValue(discountValue);
        p.setStartDate(startDate); p.setEndDate(endDate);
        p.setStatus(status == null ? "Active" : status);
        p.setConditions(conditions); p.setBannerImage(bannerImage); p.setVersion(version);
        return p;
    }
}
