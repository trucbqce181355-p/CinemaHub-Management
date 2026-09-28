package com.example.cinemahub.controller;

import com.example.cinemahub.model.Promotion;
import com.example.cinemahub.repository.PromotionRepository;
import com.example.cinemahub.service.PromotionValidationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/promotions")
@CrossOrigin(origins = "*")
public class PromotionController {
    @Autowired
    private PromotionRepository promotionRepository;
    
    @Autowired
    private PromotionValidationService validationService;

    @GetMapping
    public ResponseEntity<List<Promotion>> getAllPromotions() {
        return ResponseEntity.ok(promotionRepository.findAll());
    }

    @GetMapping("/active")
    public ResponseEntity<List<Promotion>> getActivePromotions() {
        return ResponseEntity.ok(promotionRepository.findActivePromotions(LocalDateTime.now()));
    }
    
    @PostMapping
    public ResponseEntity<?> createPromotion(@RequestBody Promotion promotion) {
        try {
            if (promotion.getStatus() == null) promotion.setStatus("Active");
            Promotion saved = promotionRepository.save(promotion);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updatePromotion(@PathVariable String id, @RequestBody Promotion promotion) {
        try {
            return promotionRepository.findById(id).map(existing -> {
                existing.setCode(promotion.getCode());
                existing.setTitle(promotion.getTitle());
                existing.setDescription(promotion.getDescription());
                existing.setDiscountType(promotion.getDiscountType());
                existing.setDiscountValue(promotion.getDiscountValue());
                existing.setStartDate(promotion.getStartDate());
                existing.setEndDate(promotion.getEndDate());
                existing.setStatus(promotion.getStatus());
                existing.setConditions(promotion.getConditions());
                existing.setBannerImage(promotion.getBannerImage());
                return ResponseEntity.ok(promotionRepository.save(existing));
            }).orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletePromotion(@PathVariable String id) {
        try {
            return promotionRepository.findById(id).map(existing -> {
                existing.setStatus("Disabled");
                promotionRepository.save(existing);
                return ResponseEntity.ok(Map.of("message", "Promotion disabled successfully"));
            }).orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
    
    @PostMapping("/validate")
    public ResponseEntity<?> validatePromotion(@RequestBody Map<String, String> body) {
        try {
            Promotion promo = validationService.validateCode(body.get("code"));
            return ResponseEntity.ok(promo);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
