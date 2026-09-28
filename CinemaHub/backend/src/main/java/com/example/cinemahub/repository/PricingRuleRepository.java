package com.example.cinemahub.repository;

import com.example.cinemahub.model.PricingRule;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PricingRuleRepository extends MongoRepository<PricingRule, String> {
}
