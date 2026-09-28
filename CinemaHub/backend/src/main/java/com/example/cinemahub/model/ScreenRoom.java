package com.example.cinemahub.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

@Data
@Document(collection = "screen_rooms")
public class ScreenRoom {
    @Id
    private String id;
    
    @NotBlank(message = "ID rạp không được để trống")
    private String cinemaId;
    
    @NotBlank(message = "Tên phòng không được để trống")
    private String name;
    
    @NotBlank(message = "Loại màn hình không được để trống")
    private String screenType;
    
    @Min(value = 1, message = "Sức chứa phải lớn hơn 0")
    private int capacity;
    
    @NotBlank(message = "Trạng thái không được để trống")
    private String status;
}
