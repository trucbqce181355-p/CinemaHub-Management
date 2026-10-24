package com.example.cinemahub.repository;

import com.example.cinemahub.model.PointTransaction;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PointTransactionRepository extends MongoRepository<PointTransaction, String> {
    List<PointTransaction> findByUserIdOrderByCreatedAtDesc(String userId);
    List<PointTransaction> findAllByOrderByCreatedAtDesc();
    List<PointTransaction> findTop50ByOrderByCreatedAtDesc();
}
