package com.example.cinemahub.controller;

import com.example.cinemahub.model.Review;
import com.example.cinemahub.model.ReviewReport;
import com.example.cinemahub.model.User;
import com.example.cinemahub.repository.UserRepository;
import com.example.cinemahub.service.ReviewService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reviews")
@CrossOrigin(origins = "*")
public class ReviewController {

    @Autowired
    private ReviewService reviewService;

    @Autowired
    private UserRepository userRepository;

    /**
     * 1. LẤY DANH SÁCH REVIEW CÔNG KHAI (PUBLISHED) CỦA PHIM
     */
    @GetMapping("/movie/{movieId}")
    public ResponseEntity<List<Review>> getMovieReviews(@PathVariable String movieId) {
        return ResponseEntity.ok(reviewService.getMovieReviews(movieId));
    }

    /**
     * 2. LẤY THỐNG KÊ ĐÁNH GIÁ (Điểm TB, số lượt, phân bố sao)
     */
    @GetMapping("/movie/{movieId}/stats")
    public ResponseEntity<Map<String, Object>> getMovieReviewStats(@PathVariable String movieId) {
        return ResponseEntity.ok(reviewService.getMovieReviewStats(movieId));
    }

    /**
     * 3. KIỂM TRA ĐIỀU KIỆN ĐÁNH GIÁ (Verified Watcher & Eligibility Check)
     */
    @GetMapping("/movie/{movieId}/eligibility")
    public ResponseEntity<?> checkEligibility(@PathVariable String movieId, Authentication authentication) {
        String userId = (authentication != null && authentication.isAuthenticated()) ? authentication.getName() : null;
        return ResponseEntity.ok(reviewService.checkEligibility(movieId, userId));
    }

    /**
     * 4. LẤY ĐÁNH GIÁ CỦA CHÍNH USER HIỆN TẠI CHO PHIM
     */
    @GetMapping("/movie/{movieId}/my-review")
    public ResponseEntity<?> getMyReview(@PathVariable String movieId, Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.ok(Map.of("hasReviewed", false));
        }
        String userId = authentication.getName();
        return reviewService.getUserReviewForMovie(movieId, userId)
                .map(r -> ResponseEntity.ok(Map.of("hasReviewed", true, "review", r)))
                .orElse(ResponseEntity.ok(Map.of("hasReviewed", false)));
    }

    /**
     * 5. GỬI BÀI ĐÁNH GIÁ MỚI (Tự động chạy qua Pre-moderation Pipeline)
     */
    @PostMapping
    public ResponseEntity<?> createReview(@RequestBody Review reviewRequest, Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).body(Map.of("error", "Vui lòng đăng nhập để gửi đánh giá phim"));
        }
        try {
            String userId = authentication.getName();
            User user = userRepository.findById(userId).orElse(null);
            String username = user != null ? user.getUsername() : "Khán giả";
            String email = user != null ? user.getEmail() : "";

            Review saved = reviewService.createReview(reviewRequest, userId, username, email);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * 6. CHỈNH SỬA ĐÁNH GIÁ (Trong vòng 48h, lưu Audit Log)
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> updateReview(
            @PathVariable String id,
            @RequestBody Review updateRequest,
            Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).body(Map.of("error", "Vui lòng đăng nhập để chỉnh sửa đánh giá"));
        }
        try {
            String userId = authentication.getName();
            Review updated = reviewService.updateReview(id, updateRequest, userId);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * 7. BÁO CÁO VI PHẠM TỪ CỘNG ĐỒNG (Community Report)
     */
    @PostMapping("/{id}/report")
    public ResponseEntity<?> reportReview(
            @PathVariable String id,
            @RequestBody Map<String, String> body,
            Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).body(Map.of("error", "Vui lòng đăng nhập để báo cáo vi phạm"));
        }
        try {
            String reporterUserId = authentication.getName();
            String reason = body.get("reason");
            String description = body.get("description");
            Map<String, Object> res = reviewService.reportReview(id, reporterUserId, reason, description);
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * 8. HÀNG ĐỢI KIỂM DUYỆT (Moderation Queue) CHO MANAGER / ADMIN
     */
    @GetMapping("/admin/moderation-queue")
    public ResponseEntity<?> getModerationQueue() {
        return ResponseEntity.ok(reviewService.getModerationQueue());
    }

    /**
     * 9. LẤY TOÀN BỘ REVIEWS CHO TRANG QUẢN TRỊ
     */
    @GetMapping("/admin/all")
    public ResponseEntity<?> getAllReviewsForAdmin(
            @RequestParam(required = false) String movieId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Integer rating,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(reviewService.getAllReviewsForAdmin(movieId, status, rating, search));
    }

    /**
     * 10. MANAGER: PHÊ DUYỆT (Approve)
     */
    @PutMapping("/{id}/approve")
    public ResponseEntity<?> approveReview(@PathVariable String id) {
        try {
            Review approved = reviewService.approveReview(id);
            return ResponseEntity.ok(approved);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * 11. MANAGER: TỪ CHỐI (Reject) KÈM LÝ DO VI PHẠM
     */
    @PutMapping("/{id}/reject")
    public ResponseEntity<?> rejectReview(
            @PathVariable String id,
            @RequestBody Map<String, String> body) {
        try {
            String reason = body.get("reason");
            Review rejected = reviewService.rejectReview(id, reason);
            return ResponseEntity.ok(rejected);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * 12. MANAGER: MASK SPOILER (Gắn cờ Spoilers bắt buộc và duyệt)
     */
    @PutMapping("/{id}/mask-spoiler")
    public ResponseEntity<?> maskSpoilerAndApprove(@PathVariable String id) {
        try {
            Review updated = reviewService.maskSpoilerAndApprove(id);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * 13. MANAGER: KHÓA / GIỚI HẠN QUYỀN ĐÁNH GIÁ CỦA USER
     */
    @PostMapping("/admin/restrict-user")
    public ResponseEntity<?> restrictUser(@RequestBody Map<String, Object> body) {
        try {
            String targetUserId = (String) body.get("userId");
            int days = body.get("days") != null ? Integer.parseInt(body.get("days").toString()) : 7;
            String reason = (String) body.get("reason");
            Map<String, Object> res = reviewService.restrictUserReviewPermission(targetUserId, days, reason);
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * 14. MANAGER: MỞ KHÓA QUYỀN ĐÁNH GIÁ CHO USER
     */
    @PostMapping("/admin/unrestrict-user")
    public ResponseEntity<?> unrestrictUser(@RequestBody Map<String, String> body) {
        try {
            String targetUserId = body.get("userId");
            Map<String, Object> res = reviewService.unrestrictUserReviewPermission(targetUserId);
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * 15. MANAGER: XEM CHI TIẾT CÁC BÁO CÁO CỘNG ĐỒNG CỦA MỘT REVIEW
     */
    @GetMapping("/{id}/reports")
    public ResponseEntity<?> getReportsForReview(@PathVariable String id) {
        List<ReviewReport> reports = reviewService.getReportsForReview(id);
        return ResponseEntity.ok(reports);
    }

    /**
     * 16. XÓA VĨNH VIỄN REVIEW
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteReview(@PathVariable String id) {
        try {
            reviewService.deleteReview(id);
            return ResponseEntity.ok(Map.of("message", "Đã xóa đánh giá thành công"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * 17. GỢI Ý PHIM CHO KHÁCH HÀNG
     */
    @GetMapping("/recommendations")
    public ResponseEntity<?> getRecommendedMovies(
            @RequestParam(required = false) String excludeMovieId,
            @RequestParam(required = false, defaultValue = "6") int limit) {
        return ResponseEntity.ok(reviewService.getRecommendedMovies(excludeMovieId, limit));
    }
}
