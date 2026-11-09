package com.example.cinemahub.repository;

import com.example.cinemahub.model.NewsArticle;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NewsArticleRepository extends MongoRepository<NewsArticle, String> {
    List<NewsArticle> findAllByOrderByCreatedAtDesc();

    List<NewsArticle> findByActiveTrueOrderByCreatedAtDesc();

    List<NewsArticle> findByCategoryAndActiveTrueOrderByCreatedAtDesc(String category);

    @Query("{ 'active': true, '$or': [ { 'title': { $regex: ?0, $options: 'i' } }, { 'summary': { $regex: ?0, $options: 'i' } }, { 'tags': { $regex: ?0, $options: 'i' } } ] }")
    List<NewsArticle> searchActiveNews(String keyword);

    @Query("{ '$or': [ { 'title': { $regex: ?0, $options: 'i' } }, { 'summary': { $regex: ?0, $options: 'i' } }, { 'tags': { $regex: ?0, $options: 'i' } } ] }")
    List<NewsArticle> searchAllNews(String keyword);
}

