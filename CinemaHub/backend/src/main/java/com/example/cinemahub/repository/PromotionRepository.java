package com.example.cinemahub.repository;

import com.example.cinemahub.model.Promotion;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PromotionRepository extends MongoRepository<Promotion, String> {
    Optional<Promotion> findByCode(String code);
    
    @Query("{ 'status': 'Active', 'startDate': { $lte: ?0 }, 'endDate': { $gte: ?0 } }")
    List<Promotion> findActivePromotions(LocalDateTime currentDate);
}
