package com.example.cinemahub.controller;
import com.example.cinemahub.model.PricingRule;
import com.example.cinemahub.dto.PricingRuleRequest;
import com.example.cinemahub.repository.PricingRuleRepository;
import com.example.cinemahub.service.PromotionManagementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
@RestController @RequestMapping("/api/pricing-rules") @RequiredArgsConstructor
public class PricingRuleController {
    private final PricingRuleRepository pricingRuleRepository;
    private final PromotionManagementService management;
    @GetMapping public List<PricingRule> getAllPricingRules() { return pricingRuleRepository.findAll(); }
    @PostMapping public ResponseEntity<PricingRule> createPricingRule(@Valid @RequestBody PricingRuleRequest request) {
        return ResponseEntity.status(201).body(management.create(request.rule()));
    }
    @PutMapping("/{id}") public PricingRule updatePricingRule(@PathVariable String id, @Valid @RequestBody PricingRuleRequest request) {
        return management.update(id, request.rule());
    }
    @DeleteMapping("/{id}") public PricingRule deletePricingRule(@PathVariable String id, @RequestParam(required=false) Long version) {
        return management.disableRule(id, version);
    }
}
