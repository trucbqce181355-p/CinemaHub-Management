package com.example.cinemahub.repository;

import com.example.cinemahub.model.Notification;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface NotificationRepository extends MongoRepository<Notification, String> {
    List<Notification> findByUserIdOrderByCreatedAtDesc(String userId);

    List<Notification> findByUserIdInOrderByCreatedAtDesc(List<String> userIds);

    long countByUserIdAndIsReadFalse(String userId);

    Optional<Notification> findByIdAndUserId(String id, String userId);

    @Query("{ 'userId': ?0, 'type': ?1, 'metadata.showtimeId': ?2 }")
    List<Notification> findRemindersByShowtime(String userId, String type, String showtimeId);

    @Query("{ 'userId': ?0, 'type': ?1, 'metadata.movieId': ?2 }")
    List<Notification> findTicketOpeningNotifications(String userId, String type, String movieId);
}
