package com.example.cinemahub.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import java.util.Map;

@Data
@Document(collection = "promotions")
public class Promotion {
    @Id
    private String id;
    
    @NotBlank(message = "Mã khuyến mãi không được để trống")
    private String code;
    
    @NotBlank(message = "Tiêu đề không được để trống")
    private String title;
    
    private String description;
    
    @NotBlank(message = "Loại giảm giá không được để trống")
    private String discountType;
    
    @Min(value = 0, message = "Giá trị giảm không được âm")
    private Double discountValue;
    
    @NotNull(message = "Ngày bắt đầu không được để trống")
    private LocalDateTime startDate;
    
    @NotNull(message = "Ngày kết thúc không được để trống")
    private LocalDateTime endDate;
    
    private String status;
    private Map<String, Object> conditions;
    private String bannerImage;
}
