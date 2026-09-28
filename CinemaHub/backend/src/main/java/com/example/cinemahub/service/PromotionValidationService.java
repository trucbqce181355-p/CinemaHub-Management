package com.example.cinemahub.service;

import com.example.cinemahub.model.Promotion;
import com.example.cinemahub.repository.PromotionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;

@Service
public class PromotionValidationService {
    @Autowired
    private PromotionRepository promotionRepository;
    
    public Promotion validateCode(String code) {
        Promotion promo = promotionRepository.findByCode(code)
                .orElseThrow(() -> new RuntimeException("Mã khuyến mãi không tồn tại"));
                
        if (!"Active".equals(promo.getStatus())) {
            throw new RuntimeException("Mã khuyến mãi đã bị vô hiệu hóa");
        }
        
        LocalDateTime now = LocalDateTime.now();
        if (now.isBefore(promo.getStartDate()) || now.isAfter(promo.getEndDate())) {
            throw new RuntimeException("Mã khuyến mãi không trong thời gian hiệu lực");
        }
        return promo;
    }
}
