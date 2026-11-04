package com.example.cinemahub.repository;

import com.example.cinemahub.model.PricingRule;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PricingRuleRepository extends MongoRepository<PricingRule, String> {
    @Query("{ 'archived': { $ne: true } }")
    List<PricingRule> findVisibleRules();

    @Query("{ 'archived': { $ne: true }, 'status': 'Active' }")
    List<PricingRule> findApplicableRules();
}
