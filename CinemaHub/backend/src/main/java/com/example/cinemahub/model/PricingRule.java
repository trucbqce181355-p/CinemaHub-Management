package com.example.cinemahub.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.Map;

@Data
@Document(collection = "pricing_rules")
public class PricingRule {
    @Id
    private String id;
    
    @NotBlank(message = "Biến kích hoạt không được để trống")
    private String triggerVariable;
    
    private Map<String, Object> conditionParams;
    
    @NotNull(message = "Giá trị điều chỉnh không được để trống")
    private Double adjustmentValue;
    
    private String status;
}
