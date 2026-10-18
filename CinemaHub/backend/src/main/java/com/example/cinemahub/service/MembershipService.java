package com.example.cinemahub.service;

import com.example.cinemahub.model.*;
import com.example.cinemahub.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class MembershipService {

    @Autowired
    private MembershipTierRepository tierRepository;

    @Autowired
    private MembershipRuleRepository ruleRepository;

    @Autowired
    private PointTransactionRepository pointTransactionRepository;

    @Autowired
    private RewardVoucherRepository rewardVoucherRepository;

    @Autowired
    private UserVoucherRepository userVoucherRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PromotionRepository promotionRepository;

    // =========================================================================
    // 1. DEFAULT DATA INITIALIZATION
    // =========================================================================
    @jakarta.annotation.PostConstruct
    public void initDefaultDataIfEmpty() {
        if (ruleRepository.count() == 0) {
            MembershipRule rule = MembershipRule.builder()
                    .earnRateVndPerPoint(1000)
                    .pointExpiryDays(365)
                    .minPointsToRedeem(500)
                    .termsAndConditions("Điểm thưởng được tích lũy tự động khi đặt vé xem phim trực tuyến hoặc tại quầy (1.000đ = 1 Điểm). "
                            + "Điểm có giá trị sử dụng trong 365 ngày để đổi các mã giảm giá và đặc quyền hấp dẫn.")
                    .updatedAt(LocalDateTime.now())
                    .build();
            ruleRepository.save(rule);
        } else {
            // Auto-migration for existing rule if it was previously set to 10,000 VND / point
            ruleRepository.findAll().forEach(rule -> {
                if (rule.getEarnRateVndPerPoint() != null && rule.getEarnRateVndPerPoint() == 10000) {
                    rule.setEarnRateVndPerPoint(1000);
                    if (rule.getMinPointsToRedeem() == null || rule.getMinPointsToRedeem() <= 50) {
                        rule.setMinPointsToRedeem(500);
                    }
                    ruleRepository.save(rule);
                }
            });
        }

        if (tierRepository.count() == 0) {
            MembershipTier bronze = MembershipTier.builder()
                    .code("BRONZE")
                    .name("Thành viên Chuẩn")
                    .level(1)
                    .minPoints(0)
                    .minSpend(0.0)
                    .pointsMultiplier(1.0)
                    .ticketDiscountPercent(0.0)
                    .fnbDiscountPercent(0.0)
                    .birthdayGift("1 Bắp ngọt cỡ vừa")
                    .badgeColor("#CD7F32")
                    .status("Active")
                    .benefits(Arrays.asList(
                            "Tích 1 điểm cho mỗi 1.000đ chi tiêu",
                            "Tặng bắp ngọt vào tháng sinh nhật",
                            "Nhận thông báo sớm các chương trình ưu đãi",
                            "Đặt vé trực tuyến giữ chỗ nhanh chóng"
                    ))
                    .description("Hạng khởi đầu dành cho mọi khách hàng đăng ký tài khoản CinemaHub.")
                    .build();

            MembershipTier silver = MembershipTier.builder()
                    .code("SILVER")
                    .name("Thành viên Bạc")
                    .level(2)
                    .minPoints(1000)
                    .minSpend(1000000.0)
                    .pointsMultiplier(1.2)
                    .ticketDiscountPercent(5.0)
                    .fnbDiscountPercent(5.0)
                    .birthdayGift("Combo 1 Bắp + 1 Nước ngọt")
                    .badgeColor("#94A3B8")
                    .status("Active")
                    .benefits(Arrays.asList(
                            "Tích 1.2x điểm cho mỗi hóa đơn đặt vé",
                            "Giảm 5% giá vé xem phim mọi suất chiếu",
                            "Giảm 5% combo bắp nước tại quầy",
                            "Quà sinh nhật Combo 1 Bắp + 1 Nước",
                            "Ưu đãi nhân đôi điểm vào ngày hội thành viên (Thứ 3 hàng tuần)"
                    ))
                    .description("Hạng dành cho khán giả thân thiết với chi tiêu tích lũy từ 1.000.000đ.")
                    .build();

            MembershipTier gold = MembershipTier.builder()
                    .code("GOLD")
                    .name("Thành viên Vàng")
                    .level(3)
                    .minPoints(3000)
                    .minSpend(3000000.0)
                    .pointsMultiplier(1.5)
                    .ticketDiscountPercent(10.0)
                    .fnbDiscountPercent(10.0)
                    .birthdayGift("1 Vé 2D Miễn Phí + Combo Bắp Nước")
                    .badgeColor("#EAB308")
                    .status("Active")
                    .benefits(Arrays.asList(
                            "Tích 1.5x điểm siêu tốc cho mọi giao dịch",
                            "Giảm 10% giá vé xem phim và combo bắp nước",
                            "Quà sinh nhật 1 Vé xem phim 2D + Combo Bắp Nước",
                            "Quầy làm thủ tục và soát vé ưu tiên (Priority Lane)",
                            "Đổi voucher giảm giá với tỷ lệ điểm ưu đãi"
                    ))
                    .description("Hạng thành viên VIP với chi tiêu tích lũy từ 3.000.000đ.")
                    .build();

            MembershipTier platinum = MembershipTier.builder()
                    .code("PLATINUM")
                    .name("Thành viên Bạch Kim")
                    .level(4)
                    .minPoints(6000)
                    .minSpend(6000000.0)
                    .pointsMultiplier(2.0)
                    .ticketDiscountPercent(15.0)
                    .fnbDiscountPercent(15.0)
                    .birthdayGift("2 Vé 2D VIP Miễn Phí + Combo Bắp Nước Lớn")
                    .badgeColor("#A855F7")
                    .status("Active")
                    .benefits(Arrays.asList(
                            "Tích 2.0x điểm tối đa (gấp đôi điểm thông thường)",
                            "Giảm 15% tất cả vé xem phim và bắp nước",
                            "Quà sinh nhật 2 Vé 2D VIP + Combo Bắp Nước lớn",
                            "Lối vào VIP chuyên biệt không cần xếp hàng",
                            "Được miễn phí đổi suất chiếu trước giờ chiếu 30 phút",
                            "Lời mời tham dự các sự kiện họp báo ra mắt phim bom tấn (Premiere)"
                    ))
                    .description("Hạng thành viên đẳng cấp cao nhất với chi tiêu tích lũy từ 6.000.000đ.")
                    .build();

            tierRepository.saveAll(Arrays.asList(bronze, silver, gold, platinum));
        } else {
            // Auto-migration for existing tiers if they still have old minPoints
            tierRepository.findAll().forEach(t -> {
                boolean changed = false;
                if ("BRONZE".equalsIgnoreCase(t.getCode())) {
                    t.setBenefits(Arrays.asList(
                            "Tích 1 điểm cho mỗi 1.000đ chi tiêu",
                            "Tặng bắp ngọt vào tháng sinh nhật",
                            "Nhận thông báo sớm các chương trình ưu đãi",
                            "Đặt vé trực tuyến giữ chỗ nhanh chóng"
                    ));
                    changed = true;
                } else if ("SILVER".equalsIgnoreCase(t.getCode()) && (t.getMinPoints() == null || t.getMinPoints() == 500)) {
                    t.setMinPoints(1000);
                    t.setMinSpend(1000000.0);
                    t.setDescription("Hạng dành cho khán giả thân thiết với chi tiêu tích lũy từ 1.000.000đ.");
                    changed = true;
                } else if ("GOLD".equalsIgnoreCase(t.getCode()) && (t.getMinPoints() == null || t.getMinPoints() == 1500)) {
                    t.setMinPoints(3000);
                    t.setMinSpend(3000000.0);
                    t.setDescription("Hạng thành viên VIP với chi tiêu tích lũy từ 3.000.000đ.");
                    changed = true;
                } else if ("PLATINUM".equalsIgnoreCase(t.getCode()) && (t.getMinPoints() == null || t.getMinPoints() == 3000)) {
                    t.setMinPoints(6000);
                    t.setMinSpend(6000000.0);
                    t.setDescription("Hạng thành viên đẳng cấp cao nhất với chi tiêu tích lũy từ 6.000.000đ.");
                    changed = true;
                }
                if (changed) {
                    tierRepository.save(t);
                }
            });
        }

        if (rewardVoucherRepository.count() == 0) {
            RewardVoucher r1 = RewardVoucher.builder()
                    .title("Mã giảm giá 20.000đ")
                    .description("Áp dụng giảm trực tiếp 20.000đ cho đơn đặt vé từ 80.000đ.")
                    .pointsRequired(500)
                    .discountType("FIXED_AMOUNT")
                    .discountValue(20000.0)
                    .minSpend(80000.0)
                    .validityDays(30)
                    .icon("ticket")
                    .status("Active")
                    .build();

            RewardVoucher r2 = RewardVoucher.builder()
                    .title("Mã giảm giá 50.000đ")
                    .description("Áp dụng giảm ngay 50.000đ cho hóa đơn đặt vé từ 150.000đ.")
                    .pointsRequired(1000)
                    .discountType("FIXED_AMOUNT")
                    .discountValue(50000.0)
                    .minSpend(150000.0)
                    .validityDays(30)
                    .icon("ticket")
                    .status("Active")
                    .build();

            RewardVoucher r3 = RewardVoucher.builder()
                    .title("Voucher Bắp Nước 45.000đ")
                    .description("Ưu đãi giảm 45.000đ cho bắp nước khi đặt cùng vé xem phim.")
                    .pointsRequired(800)
                    .discountType("FIXED_AMOUNT")
                    .discountValue(45000.0)
                    .minSpend(90000.0)
                    .validityDays(30)
                    .icon("popcorn")
                    .status("Active")
                    .build();

            RewardVoucher r4 = RewardVoucher.builder()
                    .title("Mã giảm giá 100.000đ")
                    .description("Giảm ngay 100.000đ cho các đơn đặt vé từ 250.000đ trở lên.")
                    .pointsRequired(1800)
                    .discountType("FIXED_AMOUNT")
                    .discountValue(100000.0)
                    .minSpend(250000.0)
                    .validityDays(45)
                    .icon("gift")
                    .status("Active")
                    .build();

            RewardVoucher r5 = RewardVoucher.builder()
                    .title("Voucher Giảm 20% Tổng Đơn")
                    .description("Giảm trực tiếp 20% trên tổng giá trị đơn đặt vé (tối đa 60.000đ).")
                    .pointsRequired(1500)
                    .discountType("PERCENTAGE")
                    .discountValue(20.0)
                    .minSpend(100000.0)
                    .validityDays(30)
                    .icon("percent")
                    .status("Active")
                    .build();

            rewardVoucherRepository.saveAll(Arrays.asList(r1, r2, r3, r4, r5));
        } else {
            // Auto-migration for existing reward vouchers if they still have old points
            rewardVoucherRepository.findAll().forEach(r -> {
                if (r.getPointsRequired() != null && r.getPointsRequired() <= 200) {
                    r.setPointsRequired(r.getPointsRequired() * 10);
                    rewardVoucherRepository.save(r);
                }
            });
        }
    }

    // =========================================================================
    // 2. RULES MANAGEMENT (Admin & Public)
    // =========================================================================
    public MembershipRule getRules() {
        return ruleRepository.findAll().stream().findFirst().orElseGet(() -> {
            MembershipRule r = MembershipRule.builder().build();
            return ruleRepository.save(r);
        });
    }

    public MembershipRule updateRules(MembershipRule updated) {
        MembershipRule current = getRules();
        if (updated.getEarnRateVndPerPoint() != null && updated.getEarnRateVndPerPoint() > 0) {
            current.setEarnRateVndPerPoint(updated.getEarnRateVndPerPoint());
        }
        if (updated.getPointExpiryDays() != null && updated.getPointExpiryDays() > 0) {
            current.setPointExpiryDays(updated.getPointExpiryDays());
        }
        if (updated.getMinPointsToRedeem() != null && updated.getMinPointsToRedeem() >= 0) {
            current.setMinPointsToRedeem(updated.getMinPointsToRedeem());
        }
        if (updated.getTermsAndConditions() != null) {
            current.setTermsAndConditions(updated.getTermsAndConditions());
        }
        current.setUpdatedAt(LocalDateTime.now());
        return ruleRepository.save(current);
    }

    // =========================================================================
    // 3. TIERS MANAGEMENT & BENEFITS (Admin & Public)
    // =========================================================================
    public List<MembershipTier> getAllTiers() {
        return tierRepository.findAllByOrderByLevelAsc();
    }

    public List<MembershipTier> getActiveTiers() {
        return tierRepository.findByStatusOrderByLevelAsc("Active");
    }

    public MembershipTier saveTier(MembershipTier tier) {
        if (tier.getId() != null && !tier.getId().isBlank()) {
            MembershipTier existing = tierRepository.findById(tier.getId())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy hạng thành viên"));
            existing.setName(tier.getName());
            existing.setLevel(tier.getLevel());
            existing.setMinPoints(tier.getMinPoints());
            existing.setMinSpend(tier.getMinSpend());
            existing.setPointsMultiplier(tier.getPointsMultiplier());
            existing.setTicketDiscountPercent(tier.getTicketDiscountPercent());
            existing.setFnbDiscountPercent(tier.getFnbDiscountPercent());
            existing.setBirthdayGift(tier.getBirthdayGift());
            existing.setBadgeColor(tier.getBadgeColor());
            existing.setStatus(tier.getStatus());
            existing.setBenefits(tier.getBenefits() != null ? tier.getBenefits() : new ArrayList<>());
            existing.setDescription(tier.getDescription());
            existing.setUpdatedAt(LocalDateTime.now());
            return tierRepository.save(existing);
        } else {
            if (tier.getCode() == null || tier.getCode().isBlank()) {
                tier.setCode("TIER_" + System.currentTimeMillis());
            } else {
                tier.setCode(tier.getCode().toUpperCase().trim());
            }
            tier.setCreatedAt(LocalDateTime.now());
            tier.setUpdatedAt(LocalDateTime.now());
            return tierRepository.save(tier);
        }
    }

    public void deleteTier(String id) {
        tierRepository.deleteById(id);
    }

    public MembershipTier getTierByCode(String code) {
        if (code == null) code = "BRONZE";
        return tierRepository.findByCode(code.toUpperCase())
                .orElseGet(() -> tierRepository.findByCode("BRONZE")
                        .orElse(null));
    }

    // =========================================================================
    // 4. USER MEMBERSHIP SUMMARY & NEXT TIER PROGRESS
    // =========================================================================
    public Map<String, Object> getUserMembershipSummary(String userId) {
        User user = userRepository.findById(userId)
                .orElseGet(() -> userRepository.findByEmail(userId)
                        .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng")));

        ensureUserLoyaltyDefaults(user);
        evaluateUserTier(user);
        userRepository.save(user);

        MembershipTier currentTier = getTierByCode(user.getMembershipTier());
        if (currentTier == null) {
            List<MembershipTier> activeTiers = getActiveTiers();
            currentTier = !activeTiers.isEmpty() ? activeTiers.get(0) : MembershipTier.builder().name("Thành viên").code("BRONZE").build();
        }

        List<MembershipTier> allTiers = getActiveTiers();
        MembershipTier nextTier = null;
        for (MembershipTier t : allTiers) {
            if (t.getLevel() != null && currentTier.getLevel() != null && t.getLevel() > currentTier.getLevel()) {
                nextTier = t;
                break;
            }
        }

        int currentLifetime = user.getLifetimePoints() != null ? user.getLifetimePoints() : 0;
        int pointsNeeded = 0;
        double progressPercent = 100.0;

        if (nextTier != null && nextTier.getMinPoints() != null) {
            int targetPoints = nextTier.getMinPoints();
            int basePoints = currentTier.getMinPoints() != null ? currentTier.getMinPoints() : 0;
            int span = Math.max(1, targetPoints - basePoints);
            int currentOverBase = Math.max(0, currentLifetime - basePoints);

            pointsNeeded = Math.max(0, targetPoints - currentLifetime);
            progressPercent = Math.min(100.0, Math.max(0.0, (double) currentOverBase / span * 100.0));
        }

        Map<String, Object> summary = new HashMap<>();
        summary.put("userId", user.getId());
        summary.put("username", user.getUsername());
        summary.put("email", user.getEmail());
        summary.put("phoneNumber", user.getPhoneNumber());
        summary.put("membershipCardNumber", user.getMembershipCardNumber());
        summary.put("rewardPoints", user.getRewardPoints());
        summary.put("lifetimePoints", user.getLifetimePoints());
        summary.put("currentTier", currentTier);
        summary.put("nextTier", nextTier);
        summary.put("pointsNeededForNextTier", pointsNeeded);
        summary.put("progressPercent", Math.round(progressPercent * 10.0) / 10.0);
        summary.put("allTiers", allTiers);

        return summary;
    }

    private void ensureUserLoyaltyDefaults(User user) {
        boolean modified = false;
        if (user.getRewardPoints() == null) {
            user.setRewardPoints(0);
            modified = true;
        }
        if (user.getLifetimePoints() == null) {
            user.setLifetimePoints(0);
            modified = true;
        }
        if (user.getMembershipTier() == null || user.getMembershipTier().isBlank()) {
            user.setMembershipTier("BRONZE");
            modified = true;
        }
        if (user.getMembershipCardNumber() == null || user.getMembershipCardNumber().isBlank()) {
            String suffix = user.getId() != null && user.getId().length() >= 6
                    ? user.getId().substring(user.getId().length() - 6).toUpperCase()
                    : UUID.randomUUID().toString().substring(0, 6).toUpperCase();
            user.setMembershipCardNumber("CH-" + suffix);
            modified = true;
        }
        if (modified) {
            userRepository.save(user);
        }
    }

    // =========================================================================
    // 5. MANUALLY ADJUST CUSTOMER POINTS (Admin / Staff)
    // =========================================================================
    public Map<String, Object> adjustCustomerPoints(String operatorId, String operatorName,
                                                    String customerId, int pointsDelta, String reason) {
        if (pointsDelta == 0) {
            throw new RuntimeException("Số điểm điều chỉnh phải khác 0");
        }
        if (reason == null || reason.trim().isBlank()) {
            throw new RuntimeException("Vui lòng nhập lý do điều chỉnh điểm");
        }

        User customer = userRepository.findById(customerId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy khách hàng với ID: " + customerId));

        ensureUserLoyaltyDefaults(customer);

        int currentBalance = customer.getRewardPoints() != null ? customer.getRewardPoints() : 0;
        int newBalance = currentBalance + pointsDelta;
        if (newBalance < 0) {
            throw new RuntimeException(String.format("Không thể trừ điểm. Số dư hiện tại là %d điểm, không đủ để trừ %d điểm.",
                    currentBalance, Math.abs(pointsDelta)));
        }

        customer.setRewardPoints(newBalance);

        // If positive addition, increment lifetime points as well
        if (pointsDelta > 0) {
            int currentLifetime = customer.getLifetimePoints() != null ? customer.getLifetimePoints() : 0;
            customer.setLifetimePoints(currentLifetime + pointsDelta);
        }

        // Re-evaluate tier
        evaluateUserTier(customer);
        userRepository.save(customer);

        // Record Point Transaction
        PointTransaction tx = PointTransaction.builder()
                .userId(customer.getId())
                .userEmail(customer.getEmail())
                .userName(customer.getUsername())
                .type(pointsDelta > 0 ? "MANUAL_ADJUSTMENT" : "DEDUCTION")
                .points(pointsDelta)
                .balanceAfter(newBalance)
                .reason(reason.trim())
                .adjustedBy(operatorId)
                .adjustedByName(operatorName != null ? operatorName : "Staff")
                .createdAt(LocalDateTime.now())
                .build();

        pointTransactionRepository.save(tx);

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Điều chỉnh điểm thành công!");
        response.put("userId", customer.getId());
        response.put("newRewardPoints", newBalance);
        response.put("lifetimePoints", customer.getLifetimePoints());
        response.put("membershipTier", customer.getMembershipTier());
        response.put("transaction", tx);
        return response;
    }

    private void evaluateUserTier(User user) {
        int lifetime = user.getLifetimePoints() != null ? user.getLifetimePoints() : 0;
        List<MembershipTier> tiers = tierRepository.findAllByOrderByLevelAsc();
        MembershipTier qualifying = null;

        for (MembershipTier t : tiers) {
            if ("Active".equalsIgnoreCase(t.getStatus())) {
                if (t.getMinPoints() != null && lifetime >= t.getMinPoints()) {
                    qualifying = t;
                }
            }
        }

        if (qualifying != null) {
            user.setMembershipTier(qualifying.getCode());
        }
    }

    // =========================================================================
    // 6. POINT TRANSACTIONS & AUDIT TRAIL
    // =========================================================================
    public List<PointTransaction> getUserTransactions(String userId) {
        User user = userRepository.findById(userId)
                .orElseGet(() -> userRepository.findByEmail(userId).orElse(null));
        String actualId = user != null ? user.getId() : userId;
        return pointTransactionRepository.findByUserIdOrderByCreatedAtDesc(actualId);
    }

    public List<PointTransaction> getAllTransactions() {
        return pointTransactionRepository.findTop50ByOrderByCreatedAtDesc();
    }

    // =========================================================================
    // 7. REWARD STORE & REDEMPTION (Customer & Admin)
    // =========================================================================
    public List<RewardVoucher> getAllRewards() {
        return rewardVoucherRepository.findAllByOrderByPointsRequiredAsc();
    }

    public List<RewardVoucher> getActiveRewards() {
        return rewardVoucherRepository.findByStatusOrderByPointsRequiredAsc("Active");
    }

    public RewardVoucher saveReward(RewardVoucher reward) {
        if (reward.getId() != null && !reward.getId().isBlank()) {
            RewardVoucher existing = rewardVoucherRepository.findById(reward.getId())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy quà thưởng"));
            existing.setTitle(reward.getTitle());
            existing.setDescription(reward.getDescription());
            existing.setPointsRequired(reward.getPointsRequired());
            existing.setDiscountType(reward.getDiscountType());
            existing.setDiscountValue(reward.getDiscountValue());
            existing.setMinSpend(reward.getMinSpend());
            existing.setValidityDays(reward.getValidityDays());
            existing.setIcon(reward.getIcon());
            existing.setStatus(reward.getStatus());
            return rewardVoucherRepository.save(existing);
        } else {
            reward.setCreatedAt(LocalDateTime.now());
            return rewardVoucherRepository.save(reward);
        }
    }

    public void deleteReward(String id) {
        rewardVoucherRepository.deleteById(id);
    }

    public UserVoucher redeemReward(String userId, String rewardId) {
        User user = userRepository.findById(userId)
                .orElseGet(() -> userRepository.findByEmail(userId)
                        .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng")));

        ensureUserLoyaltyDefaults(user);

        RewardVoucher reward = rewardVoucherRepository.findById(rewardId)
                .orElseThrow(() -> new RuntimeException("Món quà đổi điểm không tồn tại"));

        if (!"Active".equalsIgnoreCase(reward.getStatus())) {
            throw new RuntimeException("Món quà này hiện đang tạm ngưng đổi");
        }

        int userPoints = user.getRewardPoints() != null ? user.getRewardPoints() : 0;
        int required = reward.getPointsRequired() != null ? reward.getPointsRequired() : 0;

        if (userPoints < required) {
            throw new RuntimeException(String.format("Bạn không đủ điểm để đổi quà. Bạn có %d điểm, cần %d điểm.",
                    userPoints, required));
        }

        // Deduct points
        int newBalance = userPoints - required;
        user.setRewardPoints(newBalance);
        userRepository.save(user);

        // Generate Promo Code
        String randomSuffix = UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        String promoCode = "RDM-" + randomSuffix;

        int days = reward.getValidityDays() != null ? reward.getValidityDays() : 30;
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime expiresAt = now.plusDays(days);

        // Create Promotion document in database so booking validation service recognizes it!
        Promotion promo = new Promotion();
        promo.setCode(promoCode);
        promo.setTitle("Voucher đổi điểm: " + reward.getTitle());
        promo.setDescription(reward.getDescription());
        promo.setDiscountType(reward.getDiscountType() != null ? reward.getDiscountType() : "FIXED_AMOUNT");
        promo.setDiscountValue(reward.getDiscountValue() != null ? reward.getDiscountValue() : 0.0);
        promo.setStartDate(now.minusHours(1));
        promo.setEndDate(expiresAt);
        promo.setStatus("Active");
        Map<String, Object> cond = new HashMap<>();
        if (reward.getMinSpend() != null && reward.getMinSpend() > 0) {
            cond.put("minSpend", reward.getMinSpend());
        }
        cond.put("redeemedByUserId", user.getId());
        cond.put("rewardVoucherId", reward.getId());
        promo.setConditions(cond);
        promotionRepository.save(promo);

        // Create UserVoucher record in customer's voucher wallet
        UserVoucher voucher = UserVoucher.builder()
                .userId(user.getId())
                .userEmail(user.getEmail())
                .rewardVoucherId(reward.getId())
                .code(promoCode)
                .title(reward.getTitle())
                .discountType(reward.getDiscountType())
                .discountValue(reward.getDiscountValue())
                .minSpend(reward.getMinSpend())
                .expiresAt(expiresAt)
                .status("UNUSED")
                .redeemedAt(now)
                .build();

        UserVoucher savedVoucher = userVoucherRepository.save(voucher);

        // Record Point Transaction
        PointTransaction tx = PointTransaction.builder()
                .userId(user.getId())
                .userEmail(user.getEmail())
                .userName(user.getUsername())
                .type("REDEEM")
                .points(-required)
                .balanceAfter(newBalance)
                .reason("Đổi " + required + " điểm nhận: " + reward.getTitle())
                .referenceId(promoCode)
                .adjustedBy(user.getId())
                .adjustedByName(user.getUsername())
                .createdAt(now)
                .build();

        pointTransactionRepository.save(tx);

        return savedVoucher;
    }

    public List<UserVoucher> getUserVouchers(String userId) {
        User user = userRepository.findById(userId)
                .orElseGet(() -> userRepository.findByEmail(userId).orElse(null));
        String actualId = user != null ? user.getId() : userId;
        return userVoucherRepository.findByUserIdOrderByRedeemedAtDesc(actualId);
    }

    // =========================================================================
    // 8. AUTOMATIC POINT ACCUMULATION ON CONFIRMED BOOKING
    // =========================================================================
    public void awardPointsForBooking(Booking booking) {
        if (booking == null || booking.getTotalAmount() == null || booking.getTotalAmount() <= 0) {
            return;
        }

        User user = null;
        if (booking.getUserId() != null && !booking.getUserId().isBlank()) {
            user = userRepository.findById(booking.getUserId()).orElse(null);
        }
        if (user == null && booking.getCustomerEmail() != null && !booking.getCustomerEmail().isBlank()) {
            user = userRepository.findByEmail(booking.getCustomerEmail()).orElse(null);
        }

        if (user == null) {
            return; // Guest checkout, no member to award
        }

        ensureUserLoyaltyDefaults(user);

        MembershipRule rule = getRules();
        int earnRate = rule.getEarnRateVndPerPoint() != null && rule.getEarnRateVndPerPoint() > 0
                ? rule.getEarnRateVndPerPoint() : 1000;

        MembershipTier tier = getTierByCode(user.getMembershipTier());
        double multiplier = tier != null && tier.getPointsMultiplier() != null ? tier.getPointsMultiplier() : 1.0;

        double basePoints = booking.getTotalAmount() / earnRate;
        int pointsToAward = (int) Math.round(basePoints * multiplier);

        if (pointsToAward <= 0) {
            return;
        }

        int currentBalance = user.getRewardPoints() != null ? user.getRewardPoints() : 0;
        int currentLifetime = user.getLifetimePoints() != null ? user.getLifetimePoints() : 0;

        int newBalance = currentBalance + pointsToAward;
        int newLifetime = currentLifetime + pointsToAward;

        user.setRewardPoints(newBalance);
        user.setLifetimePoints(newLifetime);

        evaluateUserTier(user);
        userRepository.save(user);

        PointTransaction tx = PointTransaction.builder()
                .userId(user.getId())
                .userEmail(user.getEmail())
                .userName(user.getUsername())
                .type("EARN")
                .points(pointsToAward)
                .balanceAfter(newBalance)
                .reason(String.format("Tích điểm từ đơn vé #%s (Hệ số %sx)",
                        booking.getBookingReference() != null ? booking.getBookingReference() : booking.getId(),
                        multiplier))
                .referenceId(booking.getId())
                .adjustedBy("SYSTEM")
                .adjustedByName("Hệ thống Tích điểm")
                .createdAt(LocalDateTime.now())
                .build();

        pointTransactionRepository.save(tx);
    }

    public void markVoucherUsed(String promoCode, String bookingId) {
        if (promoCode == null || !promoCode.startsWith("RDM-")) {
            return;
        }
        userVoucherRepository.findByCode(promoCode).ifPresent(v -> {
            v.setStatus("USED");
            v.setUsedAt(LocalDateTime.now());
            v.setUsedBookingId(bookingId);
            userVoucherRepository.save(v);
        });

        promotionRepository.findByCode(promoCode).ifPresent(p -> {
            p.setStatus("Used");
            promotionRepository.save(p);
        });
    }

    // =========================================================================
    // 9. ADMIN CUSTOMER DIRECTORY (With loyalty points & tiers)
    // =========================================================================
    public List<Map<String, Object>> getAdminCustomersList(String search) {
        List<User> users = userRepository.findAll();
        List<Map<String, Object>> result = new ArrayList<>();

        for (User u : users) {
            if ("Customer".equalsIgnoreCase(u.getRole())) {
                boolean match = true;
                if (search != null && !search.trim().isBlank()) {
                    String s = search.trim().toLowerCase();
                    boolean nameMatch = u.getUsername() != null && u.getUsername().toLowerCase().contains(s);
                    boolean emailMatch = u.getEmail() != null && u.getEmail().toLowerCase().contains(s);
                    boolean phoneMatch = u.getPhoneNumber() != null && u.getPhoneNumber().toLowerCase().contains(s);
                    boolean cardMatch = u.getMembershipCardNumber() != null && u.getMembershipCardNumber().toLowerCase().contains(s);
                    match = nameMatch || emailMatch || phoneMatch || cardMatch;
                }

                if (match) {
                    ensureUserLoyaltyDefaults(u);
                    evaluateUserTier(u);
                    userRepository.save(u);
                    MembershipTier tier = getTierByCode(u.getMembershipTier());
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", u.getId());
                    map.put("username", u.getUsername());
                    map.put("email", u.getEmail());
                    map.put("phoneNumber", u.getPhoneNumber());
                    map.put("status", u.getStatus());
                    map.put("rewardPoints", u.getRewardPoints());
                    map.put("lifetimePoints", u.getLifetimePoints());
                    map.put("membershipTier", u.getMembershipTier());
                    map.put("tierName", tier != null ? tier.getName() : "Thành viên");
                    map.put("badgeColor", tier != null ? tier.getBadgeColor() : "#CD7F32");
                    map.put("membershipCardNumber", u.getMembershipCardNumber());
                    map.put("createdAt", u.getCreatedAt());
                    result.add(map);
                }
            }
        }

        return result;
    }
}
