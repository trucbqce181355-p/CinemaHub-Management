package com.example.cinemahub.repository;

import com.example.cinemahub.model.MembershipTier;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MembershipTierRepository extends MongoRepository<MembershipTier, String> {
    Optional<MembershipTier> findByCode(String code);
    List<MembershipTier> findByStatusOrderByLevelAsc(String status);
    List<MembershipTier> findAllByOrderByLevelAsc();
}
