package com.example.cinemahub.repository;

import com.example.cinemahub.model.RewardVoucher;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RewardVoucherRepository extends MongoRepository<RewardVoucher, String> {
    List<RewardVoucher> findByStatusOrderByPointsRequiredAsc(String status);
    List<RewardVoucher> findAllByOrderByPointsRequiredAsc();
}
