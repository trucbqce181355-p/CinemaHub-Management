package com.example.cinemahub.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "news_articles")
public class NewsArticle {
    @Id
    private String id;

    private String title;
    private String summary;
    private String content;
    private String imageUrl;
    private String category;
    private String author;
    private List<String> tags;

    @Builder.Default
    private Boolean active = true;

    @Builder.Default
    private Long views = 0L;

    @Builder.Default
    private Boolean deleted = false;

    private LocalDateTime deletedAt;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

