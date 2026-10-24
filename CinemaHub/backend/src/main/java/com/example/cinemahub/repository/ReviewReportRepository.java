package com.example.cinemahub.repository;

import com.example.cinemahub.model.ReviewReport;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReviewReportRepository extends MongoRepository<ReviewReport, String> {
    List<ReviewReport> findByReviewIdOrderByCreatedAtDesc(String reviewId);
    Optional<ReviewReport> findByReviewIdAndReporterUserId(String reviewId, String reporterUserId);
    long countByReviewId(String reviewId);
    void deleteByReviewId(String reviewId);
}
