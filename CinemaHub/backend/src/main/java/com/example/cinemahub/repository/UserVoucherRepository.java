package com.example.cinemahub.repository;

import com.example.cinemahub.model.UserVoucher;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserVoucherRepository extends MongoRepository<UserVoucher, String> {
    List<UserVoucher> findByUserIdOrderByRedeemedAtDesc(String userId);
    Optional<UserVoucher> findByCode(String code);
    Optional<UserVoucher> findByUserIdAndCode(String userId, String code);
}
