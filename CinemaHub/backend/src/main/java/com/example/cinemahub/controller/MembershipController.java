package com.example.cinemahub.controller;

import com.example.cinemahub.model.MembershipRule;
import com.example.cinemahub.model.MembershipTier;
import com.example.cinemahub.model.PointTransaction;
import com.example.cinemahub.model.RewardVoucher;
import com.example.cinemahub.model.UserVoucher;
import com.example.cinemahub.repository.UserRepository;
import com.example.cinemahub.service.MembershipService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/membership")
public class MembershipController {

    @Autowired
    private MembershipService membershipService;

    @Autowired
    private UserRepository userRepository;

    // =========================================================================
    // 1. PUBLIC / CUSTOMER TIERS & BENEFITS
    // =========================================================================
    @GetMapping("/tiers")
    public ResponseEntity<List<MembershipTier>> getActiveTiers() {
        return ResponseEntity.ok(membershipService.getActiveTiers());
    }

    @GetMapping("/all-tiers")
    @PreAuthorize("hasRole('Manager')")
    public ResponseEntity<List<MembershipTier>> getAllTiers() {
        return ResponseEntity.ok(membershipService.getAllTiers());
    }

    @PostMapping("/tiers")
    @PreAuthorize("hasRole('Manager')")
    public ResponseEntity<MembershipTier> saveTier(@RequestBody MembershipTier tier) {
        return ResponseEntity.ok(membershipService.saveTier(tier));
    }

    @DeleteMapping("/tiers/{id}")
    @PreAuthorize("hasRole('Manager')")
    public ResponseEntity<?> deleteTier(@PathVariable String id) {
        membershipService.deleteTier(id);
        return ResponseEntity.ok(Map.of("message", "Đã xóa hạng thành viên"));
    }

    // =========================================================================
    // 2. RULES
    // =========================================================================
    @GetMapping("/rules")
    public ResponseEntity<MembershipRule> getRules() {
        return ResponseEntity.ok(membershipService.getRules());
    }

    @PutMapping("/rules")
    @PreAuthorize("hasRole('Manager')")
    public ResponseEntity<MembershipRule> updateRules(@RequestBody MembershipRule rules) {
        return ResponseEntity.ok(membershipService.updateRules(rules));
    }

    // =========================================================================
    // 3. REWARDS CATALOG (Redeemable Discount Vouchers)
    // =========================================================================
    @GetMapping("/rewards")
    public ResponseEntity<List<RewardVoucher>> getActiveRewards() {
        return ResponseEntity.ok(membershipService.getActiveRewards());
    }

    @GetMapping("/all-rewards")
    @PreAuthorize("hasRole('Manager')")
    public ResponseEntity<List<RewardVoucher>> getAllRewards() {
        return ResponseEntity.ok(membershipService.getAllRewards());
    }

    @PostMapping("/rewards")
    @PreAuthorize("hasRole('Manager')")
    public ResponseEntity<RewardVoucher> saveReward(@RequestBody RewardVoucher reward) {
        return ResponseEntity.ok(membershipService.saveReward(reward));
    }

    @DeleteMapping("/rewards/{id}")
    @PreAuthorize("hasRole('Manager')")
    public ResponseEntity<?> deleteReward(@PathVariable String id) {
        membershipService.deleteReward(id);
        return ResponseEntity.ok(Map.of("message", "Đã xóa phần quà"));
    }

    // =========================================================================
    // 4. CURRENT CUSTOMER MEMBERSHIP & WALLET
    // =========================================================================
    @GetMapping("/my-membership")
    public ResponseEntity<?> getMyMembership() {
        try {
            String userId = SecurityContextHolder.getContext().getAuthentication().getName();
            return ResponseEntity.ok(membershipService.getUserMembershipSummary(userId));
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    @GetMapping("/my-transactions")
    public ResponseEntity<?> getMyTransactions() {
        try {
            String userId = SecurityContextHolder.getContext().getAuthentication().getName();
            return ResponseEntity.ok(membershipService.getUserTransactions(userId));
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    @GetMapping("/my-vouchers")
    public ResponseEntity<?> getMyVouchers() {
        try {
            String userId = SecurityContextHolder.getContext().getAuthentication().getName();
            return ResponseEntity.ok(membershipService.getUserVouchers(userId));
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    @PostMapping("/redeem")
    public ResponseEntity<?> redeemReward(@RequestBody Map<String, String> body) {
        String userId = SecurityContextHolder.getContext().getAuthentication().getName();
        String rewardId = body.get("rewardId");
        if (rewardId == null || rewardId.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Thiếu mã phần quà cần đổi"));
        }
        try {
            UserVoucher voucher = membershipService.redeemReward(userId, rewardId);
            return ResponseEntity.ok(Map.of(
                    "message", "Đổi điểm thành công! Mã ưu đãi đã được lưu vào ví của bạn.",
                    "voucher", voucher
            ));
        } catch (RuntimeException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    // =========================================================================
    // 5. STAFF & ADMIN: MANUAL POINTS ADJUSTMENT & AUDIT
    // =========================================================================
    @PostMapping("/adjust-points")
    @PreAuthorize("hasRole('Manager')")
    public ResponseEntity<?> adjustPoints(@RequestBody Map<String, Object> body) {
        String operatorId = SecurityContextHolder.getContext().getAuthentication().getName();
        String operatorName = userRepository.findById(operatorId)
                .map(u -> u.getUsername() != null ? u.getUsername() : u.getEmail())
                .orElse("Staff");

        String customerId = (String) body.get("userId");
        Object pointsObj = body.get("points");
        String reason = (String) body.get("reason");

        if (customerId == null || customerId.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Vui lòng chọn khách hàng"));
        }
        if (pointsObj == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Vui lòng nhập số điểm điều chỉnh"));
        }

        int pointsDelta;
        try {
            pointsDelta = Integer.parseInt(pointsObj.toString());
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Số điểm không hợp lệ"));
        }

        try {
            Map<String, Object> res = membershipService.adjustCustomerPoints(
                    operatorId, operatorName, customerId, pointsDelta, reason);
            return ResponseEntity.ok(res);
        } catch (RuntimeException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    @GetMapping("/admin/transactions")
    @PreAuthorize("hasRole('Manager')")
    public ResponseEntity<List<PointTransaction>> getAdminTransactions() {
        return ResponseEntity.ok(membershipService.getAllTransactions());
    }

    @GetMapping("/admin/customers")
    @PreAuthorize("hasRole('Manager')")
    public ResponseEntity<?> getAdminCustomers(@RequestParam(value = "search", required = false) String search) {
        return ResponseEntity.ok(membershipService.getAdminCustomersList(search));
    }
}
