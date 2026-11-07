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
    @GetMapping public List<PricingRule> getAllPricingRules() { return pricingRuleRepository.findVisibleRules(); }
    @GetMapping("/{id}") public PricingRule getPricingRule(@PathVariable String id) {
        return pricingRuleRepository.findById(id).filter(r -> !r.isArchived()).orElseThrow(() ->
                new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "Không tìm thấy luật giá"));
    }
    @PatchMapping("/{id}/status") public PricingRule changeStatus(@PathVariable String id,
            @Valid @RequestBody com.example.cinemahub.dto.ProgramStatusRequest request) {
        return management.changeRuleStatus(id, request.status(), request.version());
    }
    @PostMapping public ResponseEntity<PricingRule> createPricingRule(@Valid @RequestBody PricingRuleRequest request) {
        return ResponseEntity.status(201).body(management.create(request.rule()));
    }
    @PutMapping("/{id}") public PricingRule updatePricingRule(@PathVariable String id, @Valid @RequestBody PricingRuleRequest request) {
        return management.update(id, request.rule());
    }
    @DeleteMapping("/{id}") public PricingRule deletePricingRule(@PathVariable String id, @RequestParam(required=false) Long version) {
        return management.disableRule(id, version);
    }
    @DeleteMapping("/{id}/archive") public PricingRule archivePricingRule(@PathVariable String id, @RequestParam(required=false) Long version) {
        return management.archiveRule(id, version);
    }
}
