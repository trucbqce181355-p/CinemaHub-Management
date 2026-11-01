package com.example.cinemahub.controller;
import com.example.cinemahub.model.Promotion;
import com.example.cinemahub.dto.PromotionRequest;
import com.example.cinemahub.repository.PromotionRepository;
import com.example.cinemahub.service.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.*;
@RestController @RequestMapping("/api/promotions") @RequiredArgsConstructor
public class PromotionController {
    private final PromotionRepository promotionRepository;
    private final PromotionValidationService validationService;
    private final PromotionManagementService management;
    @GetMapping public List<Promotion> getAllPromotions() { return promotionRepository.findAll(); }
    public record PublicPromotion(String code, String title, String description, String discountType,
            Double discountValue, LocalDateTime startDate, LocalDateTime endDate, String bannerImage,
            Object minSpend, Object maxDiscount) {}
    @GetMapping("/active") public List<PublicPromotion> getActivePromotions() {
        return promotionRepository.findActivePromotions(LocalDateTime.now()).stream()
                .filter(p -> p.getConditions() == null || !p.getConditions().containsKey("redeemedByUserId"))
                .map(p -> { var c = p.getConditions() == null ? Map.<String,Object>of() : p.getConditions();
                    return new PublicPromotion(p.getCode(), p.getTitle(), p.getDescription(), p.getDiscountType(),
                            p.getDiscountValue(), p.getStartDate(), p.getEndDate(), p.getBannerImage(), c.get("minSpend"), c.get("maxDiscount"));
                }).toList();
    }
    @PostMapping public ResponseEntity<Promotion> createPromotion(@Valid @RequestBody PromotionRequest request) {
        return ResponseEntity.status(201).body(management.create(request.promotion()));
    }
    @PutMapping("/{id}") public Promotion updatePromotion(@PathVariable String id, @Valid @RequestBody PromotionRequest request) {
        return management.update(id, request.promotion());
    }
    @DeleteMapping("/{id}") public Promotion deletePromotion(@PathVariable String id, @RequestParam(required=false) Long version) {
        return management.disable(id, version);
    }
    public record CheckRequest(String code, Double subtotal) {}
    @PostMapping("/validate") public Map<String, Object> validatePromotion(@RequestBody CheckRequest request, Authentication auth) {
        if (request.subtotal() == null) throw new IllegalArgumentException("Thiếu giá trị đơn hàng");
        Promotion p = validationService.validateCode(request.code());
        double discount = validationService.discount(p, request.subtotal(), auth.getName(), null);
        return Map.of("code", p.getCode(), "discountAmount", discount, "newTotal", Money.vnd(request.subtotal()-discount));
    }
}
