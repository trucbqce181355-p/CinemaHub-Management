package com.example.cinemahub.repository;

import com.example.cinemahub.model.Review;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReviewRepository extends MongoRepository<Review, String> {
    List<Review> findByMovieIdAndStatusOrderByCreatedAtDesc(String movieId, String status);

    List<Review> findByMovieIdOrderByCreatedAtDesc(String movieId);

    List<Review> findByUserIdOrderByCreatedAtDesc(String userId);

    Optional<Review> findByMovieIdAndUserId(String movieId, String userId);

    List<Review> findByStatusOrderByCreatedAtDesc(String status);

    List<Review> findAllByOrderByCreatedAtDesc();

    long countByMovieIdAndStatus(String movieId, String status);

    long countByStatus(String status);

    List<Review> findByStatusInOrderByCreatedAtDesc(List<String> statuses);
}
