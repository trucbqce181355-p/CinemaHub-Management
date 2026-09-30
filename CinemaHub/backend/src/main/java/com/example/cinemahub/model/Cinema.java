package com.example.cinemahub.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import java.util.Map;

@Data
@Document(collection = "cinemas")
public class Cinema {
    @Id
    private String id;
    
    @NotBlank(message = "Tên rạp không được để trống")
    private String name;
    
    @NotBlank(message = "Địa chỉ không được để trống")
    private String address;
    
    private String contactPhone;
    private String contactEmail;
    
    @NotBlank(message = "Trạng thái không được để trống")
    private String status;
    
    private List<String> facilities;
    private Map<String, Double> mapCoordinates;
}

