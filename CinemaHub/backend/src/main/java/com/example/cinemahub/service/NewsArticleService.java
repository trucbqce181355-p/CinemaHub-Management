package com.example.cinemahub.service;

import com.example.cinemahub.dto.NewsArticleRequest;
import com.example.cinemahub.model.NewsArticle;
import com.example.cinemahub.repository.NewsArticleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class NewsArticleService {

    private final NewsArticleRepository newsArticleRepository;
    private final MongoTemplate mongoTemplate;

    public NewsArticle createNews(NewsArticleRequest request, String fallbackAuthor) {
        String author = (request.getAuthor() != null && !request.getAuthor().isBlank())
                ? request.getAuthor()
                : (fallbackAuthor != null ? fallbackAuthor : "CinemaHub Admin");

        NewsArticle article = NewsArticle.builder()
                .title(request.getTitle())
                .summary(request.getSummary())
                .content(request.getContent())
                .imageUrl(request.getImageUrl())
                .category(request.getCategory() != null && !request.getCategory().isBlank() ? request.getCategory() : "DIEN_ANH")
                .author(author)
                .tags(request.getTags() != null ? request.getTags() : new ArrayList<>())
                .active(request.getActive() != null ? request.getActive() : true)
                .deleted(false)
                .views(0L)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        return newsArticleRepository.save(article);
    }

    public NewsArticle updateNews(String id, NewsArticleRequest request) {
        NewsArticle existing = newsArticleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bài viết tin tức với ID: " + id));

        if (request.getTitle() != null && !request.getTitle().isBlank()) {
            existing.setTitle(request.getTitle());
        }
        if (request.getSummary() != null) {
            existing.setSummary(request.getSummary());
        }
        if (request.getContent() != null && !request.getContent().isBlank()) {
            existing.setContent(request.getContent());
        }
        if (request.getImageUrl() != null) {
            existing.setImageUrl(request.getImageUrl());
        }
        if (request.getCategory() != null && !request.getCategory().isBlank()) {
            existing.setCategory(request.getCategory());
        }
        if (request.getAuthor() != null && !request.getAuthor().isBlank()) {
            existing.setAuthor(request.getAuthor());
        }
        if (request.getTags() != null) {
            existing.setTags(request.getTags());
        }
        if (request.getActive() != null) {
            existing.setActive(request.getActive());
        }

        existing.setUpdatedAt(LocalDateTime.now());
        return newsArticleRepository.save(existing);
    }

    public void deleteNews(String id) {
        NewsArticle existing = newsArticleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bài viết tin tức với ID: " + id));

        // Xóa mềm: đánh dấu deleted = true, tắt active và ghi nhận thời điểm xóa
        existing.setDeleted(true);
        existing.setDeletedAt(LocalDateTime.now());
        existing.setActive(false);
        existing.setUpdatedAt(LocalDateTime.now());
        newsArticleRepository.save(existing);
    }

    public NewsArticle toggleActiveStatus(String id, Boolean active) {
        NewsArticle existing = newsArticleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bài viết tin tức với ID: " + id));

        if (Boolean.TRUE.equals(existing.getDeleted())) {
            throw new RuntimeException("Không thể đổi trạng thái bài viết đã bị xóa");
        }

        boolean newStatus = (active != null) ? active : !Boolean.TRUE.equals(existing.getActive());
        existing.setActive(newStatus);
        existing.setUpdatedAt(LocalDateTime.now());
        return newsArticleRepository.save(existing);
    }

    public NewsArticle getNewsById(String id, boolean incrementViews) {
        NewsArticle existing = newsArticleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bài viết tin tức với ID: " + id));

        if (Boolean.TRUE.equals(existing.getDeleted())) {
            throw new RuntimeException("Bài viết này đã được xóa hoặc không còn tồn tại");
        }

        if (incrementViews) {
            long currentViews = existing.getViews() != null ? existing.getViews() : 0L;
            existing.setViews(currentViews + 1);
            return newsArticleRepository.save(existing);
        }
        return existing;
    }

    public List<NewsArticle> getAllNewsForAdmin(String search, String category, Boolean active) {
        Query query = new Query();
        List<Criteria> criteriaList = new ArrayList<>();

        // Xóa mềm: Loại trừ những bài viết có deleted == true
        criteriaList.add(new Criteria().orOperator(
                Criteria.where("deleted").is(false),
                Criteria.where("deleted").exists(false),
                Criteria.where("deleted").is(null)
        ));

        if (search != null && !search.trim().isEmpty()) {
            String regex = Pattern.quote(search.trim());
            criteriaList.add(new Criteria().orOperator(
                    Criteria.where("title").regex(regex, "i"),
                    Criteria.where("summary").regex(regex, "i"),
                    Criteria.where("author").regex(regex, "i"),
                    Criteria.where("tags").regex(regex, "i")
            ));
        }

        if (category != null && !category.trim().isEmpty() && !category.equalsIgnoreCase("ALL")) {
            criteriaList.add(Criteria.where("category").is(category.trim()));
        }

        if (active != null) {
            criteriaList.add(Criteria.where("active").is(active));
        }

        if (!criteriaList.isEmpty()) {
            query.addCriteria(new Criteria().andOperator(criteriaList.toArray(new Criteria[0])));
        }

        query.with(Sort.by(Sort.Direction.DESC, "createdAt"));
        return mongoTemplate.find(query, NewsArticle.class);
    }

    public List<NewsArticle> getPublicNews(String search, String category) {
        return getAllNewsForAdmin(search, category, true);
    }
}

