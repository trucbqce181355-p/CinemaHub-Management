package com.example.cinemahub.service;
import com.example.cinemahub.model.*;
import com.example.cinemahub.repository.PromotionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.*;
import java.time.LocalDateTime;
import java.util.*;
@Service
public class PromotionValidationService {
    @Autowired private PromotionRepository promotionRepository;
    @Autowired private MongoTemplate mongo;
    public record PromotionOption(String code, String title, String description, String discountType,
            Double discountValue, LocalDateTime endDate, Object minSpend, Object maxDiscount,
            boolean eligible, double discountAmount, String reason, Long remainingUses) {}

    /** Read-only eligibility against server pricing; excludes this hold from usage counts. */
    public List<PromotionOption> options(double subtotal, String userId, String bookingId, boolean online) {
        Money.vnd(subtotal);
        return promotionRepository.findActivePromotions(LocalDateTime.now()).stream()
                .filter(p -> p.getConditions() == null || !p.getConditions().containsKey("redeemedByUserId")
                        || Objects.equals(p.getConditions().get("redeemedByUserId"), userId))
                .map(p -> {
                    Map<String,Object> c = p.getConditions() == null ? Map.of() : p.getConditions();
                    double amount = 0;
                    Long remainingUses = null;
                    String reason = null;
                    try {
                        if (c.containsKey("usageLimit")) {
                            long limit = (long) PromotionRules.amount(c.get("usageLimit"));
                            // Only completed bookings and live payment attempts consume quota.
                            remainingUses = Math.max(0L, limit - count(p.getCode(), null, null));
                        }
                        Promotion current = validateCode(p.getCode());
                        amount = discount(current, subtotal, userId, bookingId);
                        if (amount <= 0) reason = "Mã không tạo ra giảm giá cho đơn hàng này";
                        else if (online && subtotal - amount <= 0)
                            reason = "Thanh toán online cần tổng tiền lớn hơn 0. Vui lòng dùng mã khác";
                    } catch (IllegalArgumentException ex) { reason = ex.getMessage(); }
                    return new PromotionOption(p.getCode(), p.getTitle(), p.getDescription(), p.getDiscountType(),
                            p.getDiscountValue(), p.getEndDate(), c.get("minSpend"), c.get("maxDiscount"),
                            reason == null, reason == null ? amount : 0, reason, remainingUses);
                }).toList();
    }
    public Promotion validateCode(String code) {
        List<Promotion> matches = promotionRepository.findAllByCodeIgnoreCase(PromotionRules.code(code));
        if (matches.size() != 1) throw new IllegalArgumentException(matches.isEmpty()
                ? "Mã khuyến mãi không tồn tại" : "Mã khuyến mãi bị trùng; vui lòng liên hệ quản lý");
        Promotion p = matches.get(0);
        if (p.isArchived()) throw new IllegalArgumentException("Mã khuyến mãi đã được xóa khỏi danh sách");
        PromotionRules.validate(p);
        if (!PromotionRules.active(p, LocalDateTime.now())) throw new IllegalArgumentException("Khuyến mãi không còn hiệu lực");
        return p;
    }
    public double discount(Promotion p, double subtotal, String userId, String bookingId) {
        double amount = PromotionRules.discount(p, subtotal, userId);
        Map<String,Object> c = p.getConditions() == null ? Map.of() : p.getConditions();
        if (c.containsKey("usageLimit") && count(p.getCode(), null, bookingId) >= PromotionRules.amount(c.get("usageLimit")))
            throw new IllegalArgumentException("Khuyến mãi đã hết lượt sử dụng");
        if (c.containsKey("perUserLimit") || c.containsKey("redeemedByUserId")) {
            if (userId == null || userId.isBlank()) throw new IllegalArgumentException("Cần tài khoản khách hàng để sử dụng voucher này");
            double limit = c.containsKey("redeemedByUserId") ? 1 : PromotionRules.amount(c.get("perUserLimit"));
            if (c.containsKey("perUserLimit")) limit = Math.min(limit, PromotionRules.amount(c.get("perUserLimit")));
            if (count(p.getCode(), userId, bookingId) >= limit) throw new IllegalArgumentException("Tài khoản đã hết lượt dùng khuyến mãi");
        }
        return amount;
    }
    private long count(String code, String userId, String exclude) {
        Criteria c = Criteria.where("promoCode").is(code).orOperator(Criteria.where("status").is("CONFIRMED"),
                Criteria.where("status").is("PENDING").and("payment.status").is("PENDING")
                        .and("holdExpiresAt").gt(LocalDateTime.now()));
        if (userId != null) c.and("userId").is(userId);
        if (exclude != null) c.and("_id").ne(exclude);
        return mongo.count(Query.query(c).collation(Collation.of("en").strength(Collation.ComparisonLevel.secondary())), Booking.class);
    }
}
