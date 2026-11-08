package com.example.cinemahub.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NewsArticleRequest {
    @NotBlank(message = "Tiêu đề bài viết không được để trống")
    private String title;

    private String summary;

    @NotBlank(message = "Nội dung bài viết không được để trống")
    private String content;

    private String imageUrl;
    private String category;
    private String author;
    private List<String> tags;
    private Boolean active;
}

