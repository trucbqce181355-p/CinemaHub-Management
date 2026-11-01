package com.example.cinemahub.dto;

import com.example.cinemahub.model.PricingRule;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.Map;

public record PricingRuleRequest(@NotBlank String triggerVariable, Map<String, Object> conditionParams,
        @NotNull Double adjustmentValue, String status, Long version) {
    public PricingRule rule() {
        PricingRule r = new PricingRule(); r.setTriggerVariable(triggerVariable);
        r.setConditionParams(conditionParams); r.setAdjustmentValue(adjustmentValue);
        r.setStatus(status == null ? "Active" : status); r.setVersion(version); return r;
    }
}
