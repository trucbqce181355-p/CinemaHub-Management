package com.example.cinemahub.controller;

import com.example.cinemahub.dto.NewsArticleRequest;
import com.example.cinemahub.model.NewsArticle;
import com.example.cinemahub.model.User;
import com.example.cinemahub.repository.UserRepository;
import com.example.cinemahub.service.NewsArticleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/news")
@RequiredArgsConstructor
public class NewsArticleController {

    private final NewsArticleService newsArticleService;
    private final UserRepository userRepository;

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
        String author = "CinemaHub Admin";
        if (authentication != null && authentication.isAuthenticated() && authentication.getName() != null) {
            author = userRepository.findById(authentication.getName())
                    .map(User::getUsername)
                    .filter(name -> !name.isBlank())
                    .orElse("CinemaHub Admin");
        }
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

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidationError(MethodArgumentNotValidException ex) {
        String msg = ex.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(err -> err.getDefaultMessage() != null ? err.getDefaultMessage() : "Dữ liệu bài viết không hợp lệ")
                .orElse("Dữ liệu bài viết không hợp lệ");
        return ResponseEntity.badRequest().body(Map.of("message", msg, "error", msg));
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, String>> handleRuntimeError(RuntimeException ex) {
        String msg = ex.getMessage() != null ? ex.getMessage() : "Không thể xử lý bài viết tin tức";
        return ResponseEntity.badRequest().body(Map.of("message", msg, "error", msg));
    }
}

