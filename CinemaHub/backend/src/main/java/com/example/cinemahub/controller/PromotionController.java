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

    @GetMapping("/active")
    public ResponseEntity<List<Promotion>> getActivePromotions() {
        return ResponseEntity.ok(promotionRepository.findActivePromotions(LocalDateTime.now()));
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
