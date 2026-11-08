package com.example.cinemahub.controller;

import com.example.cinemahub.dto.NewsArticleRequest;
import com.example.cinemahub.model.NewsArticle;
import com.example.cinemahub.service.NewsArticleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/news")
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173"})
@RequiredArgsConstructor
public class NewsArticleController {

    private final NewsArticleService newsArticleService;

    @GetMapping
    public ResponseEntity<List<NewsArticle>> getAllNews(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) Boolean active) {
        return ResponseEntity.ok(newsArticleService.getAllNewsForAdmin(search, category, active));
    }

    @GetMapping("/public")
    public ResponseEntity<List<NewsArticle>> getPublicNews(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String category) {
        return ResponseEntity.ok(newsArticleService.getPublicNews(search, category));
    }

    @GetMapping("/{id}")
    public ResponseEntity<NewsArticle> getNewsDetails(
            @PathVariable String id,
            @RequestParam(defaultValue = "true") boolean incrementViews) {
        return ResponseEntity.ok(newsArticleService.getNewsById(id, incrementViews));
    }

    @PostMapping
    public ResponseEntity<NewsArticle> createNews(
            @Valid @RequestBody NewsArticleRequest request,
            Authentication authentication) {
        String author = (authentication != null && authentication.isAuthenticated())
                ? authentication.getName()
                : "CinemaHub Admin";
        return ResponseEntity.ok(newsArticleService.createNews(request, author));
    }

    @PutMapping("/{id}")
    public ResponseEntity<NewsArticle> updateNews(
            @PathVariable String id,
            @Valid @RequestBody NewsArticleRequest request) {
        return ResponseEntity.ok(newsArticleService.updateNews(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteNews(@PathVariable String id) {
        newsArticleService.deleteNews(id);
        return ResponseEntity.ok(Map.of("message", "Đã xóa bài viết tin tức thành công!"));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<NewsArticle> toggleStatus(
            @PathVariable String id,
            @RequestParam(required = false) Boolean active) {
        return ResponseEntity.ok(newsArticleService.toggleActiveStatus(id, active));
    }
}

