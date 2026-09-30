package com.example.cinemahub.controller;

import com.example.cinemahub.model.PricingRule;
import com.example.cinemahub.repository.PricingRuleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/pricing-rules")
@CrossOrigin(origins = "*")
public class PricingRuleController {
    @Autowired
    private PricingRuleRepository pricingRuleRepository;

    @GetMapping
    public ResponseEntity<List<PricingRule>> getAllPricingRules() {
        return ResponseEntity.ok(pricingRuleRepository.findAll());
    }

    @PostMapping
    public ResponseEntity<?> createPricingRule(@RequestBody PricingRule rule) {
        try {
            if (rule.getStatus() == null) rule.setStatus("Active");
            PricingRule saved = pricingRuleRepository.save(rule);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updatePricingRule(@PathVariable String id, @RequestBody PricingRule rule) {
        try {
            return pricingRuleRepository.findById(id).map(existing -> {
                existing.setTriggerVariable(rule.getTriggerVariable());
                existing.setConditionParams(rule.getConditionParams());
                existing.setAdjustmentValue(rule.getAdjustmentValue());
                existing.setStatus(rule.getStatus());
                return ResponseEntity.ok(pricingRuleRepository.save(existing));
            }).orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletePricingRule(@PathVariable String id) {
        try {
            return pricingRuleRepository.findById(id).map(existing -> {
                existing.setStatus("Disabled");
                pricingRuleRepository.save(existing);
                return ResponseEntity.ok(Map.of("message", "Pricing rule disabled successfully"));
            }).orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
