package com.example.cinemahub.service;

import com.example.cinemahub.model.*;
import com.example.cinemahub.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class ReviewService {

    @Autowired
    private ReviewRepository reviewRepository;

    @Autowired
    private ReviewReportRepository reviewReportRepository;

    @Autowired
    private MovieRepository movieRepository;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private TicketRepository ticketRepository;

    @Autowired
    private ShowtimeRepository showtimeRepository;

    @Autowired
    private UserRepository userRepository;

    // In-memory rate limiting map: userId -> lastSubmitTimestamp
    private final Map<String, Long> userLastSubmitMap = new ConcurrentHashMap<>();

    // Từ cấm nghiêm trọng (Xúc phạm nặng, cờ bạc lừa đảo, phát tán link độc) -> Chuyển sang REJECTED
    private static final List<String> SEVERE_PROFANITY_WORDS = Arrays.asList(
            "đụ", "đụ má", "địt", "địt mẹ", "lồn", "buồi", "cặc", "chó đẻ", "đĩ", 
            "mẹ mày", "óc chó", "nhà cái", "cá cược", "đá gà", "casino", "lô đề", 
            "nạp rút", "kèo banh", "kubet", "thabet", "baccarat", "gái gọi", "sex", "khiêu dâm"
    );

    // Từ ngữ nghi vấn / Tên đối thủ cạnh tranh -> Chuyển sang PENDING_MODERATION
    private static final List<String> SUSPICIOUS_WORDS = Arrays.asList(
            "lotte", "lotte cinema", "galaxy cinema", "galaxy", "bhd", "bhd star", 
            "beta cinema", "cinestar", "mega gs", "qua rạp khác", "rạp đối thủ", 
            "tẩy chay", "lừa đảo"
    );

    // Regex phát hiện link URL, số điện thoại và liên hệ mạng xã hội
    private static final Pattern URL_PATTERN = Pattern.compile(
            "(?i)(https?://|www\\.|[a-zA-Z0-9_-]+\\.(com|vn|net|org|xyz|top|cc|biz|info|club|online))"
    );
    private static final Pattern PHONE_PATTERN = Pattern.compile(
            "(?<!\\d)(?:\\+?84|0)(3[2-9]|5[689]|7[06-9]|8[1-9]|9[0-9])[0-9]{7}(?!\\d)"
    );
    private static final Pattern SOCIAL_PATTERN = Pattern.compile(
            "(?i)(zalo|telegram|t\\.me|facebook\\.com|fb\\.com)"
    );

    /**
     * 1. KIỂM TRA ĐIỀU KIỆN ĐÁNH GIÁ (Verified Watcher & Eligibility Check)
     */
    public Map<String, Object> checkEligibility(String movieId, String userId) {
        Map<String, Object> result = new HashMap<>();

        if (userId == null || userId.isBlank()) {
            result.put("canReview", false);
            result.put("reason", "NOT_LOGGED_IN");
            result.put("message", "Vui lòng đăng nhập để đánh giá phim.");
            result.put("hasReviewed", false);
            return result;
        }

        // 1. Kiểm tra tài khoản có bị khóa quyền review không
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            if (Boolean.TRUE.equals(user.getReviewRestricted())) {
                Date until = user.getReviewRestrictedUntil();
                if (until == null || until.after(new Date())) {
                    result.put("canReview", false);
                    result.put("reason", "ACCOUNT_RESTRICTED");
                    result.put("message", "Tài khoản của bạn tạm thời bị khóa quyền đánh giá do vi phạm tiêu chuẩn cộng đồng (" + 
                            (user.getReviewRestrictedReason() != null ? user.getReviewRestrictedReason() : "Nội dung vi phạm") + ").");
                    result.put("hasReviewed", false);
                    return result;
                }
            }
        }

        // 2. Kiểm tra xem user đã có review cho phim này chưa (Quy tắc Cardinality: tối đa 1 review/phim)
        Optional<Review> existingOpt = reviewRepository.findByMovieIdAndUserId(movieId, userId);
        if (existingOpt.isPresent()) {
            Review existing = existingOpt.get();
            boolean canEdit = existing.getCreatedAt() != null && 
                    existing.getCreatedAt().plusHours(48).isAfter(LocalDateTime.now());
            result.put("canReview", false);
            result.put("hasReviewed", true);
            result.put("canEdit", canEdit);
            result.put("review", existing);
            result.put("reason", "ALREADY_REVIEWED");
            result.put("message", canEdit 
                    ? "Bạn đã đánh giá phim này. Bạn có thể chỉnh sửa trong vòng 48 giờ."
                    : "Bạn đã đánh giá phim này (đã hết thời hạn 48 giờ chỉnh sửa).");
            return result;
        }

        result.put("hasReviewed", false);

        // 3. Quy tắc "Verified Watcher": Kiểm tra giao dịch mua vé của User
        List<Booking> userBookings = bookingRepository.findByUserIdAndMovieId(userId, movieId);
        if (userBookings.isEmpty() && userOpt.isPresent() && userOpt.get().getEmail() != null) {
            userBookings = bookingRepository.findByCustomerEmailAndMovieId(userOpt.get().getEmail(), movieId);
        }

        // Lọc các booking hợp lệ (đã thanh toán thành công / CONFIRMED / COMPLETED)
        List<Booking> confirmedBookings = userBookings.stream()
                .filter(b -> b.getStatus() != null && 
                        ("CONFIRMED".equalsIgnoreCase(b.getStatus()) || 
                         "COMPLETED".equalsIgnoreCase(b.getStatus()) || 
                         "PAID".equalsIgnoreCase(b.getStatus())))
                .collect(Collectors.toList());

        if (confirmedBookings.isEmpty()) {
            result.put("canReview", false);
            result.put("reason", "NO_BOOKING");
            result.put("message", "Bạn cần đặt vé và xem phim tại rạp để có thể gửi đánh giá.");
            return result;
        }

        // Kiểm tra điều kiện: Vé đã soát (Used) HOẶC suất chiếu đã kết thúc (+ 15 phút buffer)
        Booking validWatchedBooking = null;
        boolean hasPendingShowtime = false;

        for (Booking b : confirmedBookings) {
            // Kiểm tra vé USED
            boolean ticketUsed = false;
            Ticket ticket = null;
            if (b.getTicketId() != null) {
                ticket = ticketRepository.findById(b.getTicketId()).orElse(null);
            }
            if (ticket == null && b.getBookingReference() != null) {
                ticket = ticketRepository.findByBookingReference(b.getBookingReference()).orElse(null);
            }
            if (ticket == null && b.getId() != null) {
                ticket = ticketRepository.findByBookingId(b.getId()).orElse(null);
            }

            if (ticket != null) {
                if ("Used".equalsIgnoreCase(ticket.getStatus())) {
                    ticketUsed = true;
                } else if (ticket.getSeats() != null) {
                    for (Ticket.SeatStatus seat : ticket.getSeats()) {
                        if ("Used".equalsIgnoreCase(seat.getUsageStatus())) {
                            ticketUsed = true;
                            break;
                        }
                    }
                }
            }

            // Kiểm tra thời gian kết thúc suất chiếu + 15 phút buffer
            LocalDateTime showtimeEnd = null;
            if (b.getShowtimeId() != null) {
                Showtime st = showtimeRepository.findById(b.getShowtimeId()).orElse(null);
                if (st != null) {
                    if (st.getEndTime() != null) {
                        showtimeEnd = st.getEndTime();
                    } else if (st.getStartTime() != null && st.getMovieDuration() != null) {
                        showtimeEnd = st.getStartTime().plusMinutes(st.getMovieDuration());
                    }
                }
            }
            if (showtimeEnd == null && b.getShowtimeStart() != null) {
                showtimeEnd = b.getShowtimeStart().plusMinutes(120);
            }

            boolean showtimeFinished = (showtimeEnd != null && LocalDateTime.now().isAfter(showtimeEnd.plusMinutes(15)));

            if (ticketUsed || showtimeFinished) {
                validWatchedBooking = b;
                break;
            } else {
                hasPendingShowtime = true;
            }
        }

        if (validWatchedBooking != null) {
            result.put("canReview", true);
            result.put("reason", "ELIGIBLE");
            result.put("bookingId", validWatchedBooking.getId());
            result.put("bookingReference", validWatchedBooking.getBookingReference());
            result.put("isVerifiedWatcher", true);
            result.put("message", "Bạn đủ điều kiện để đánh giá với tư cách Khán giả đã xem tại rạp (Verified Watcher).");
            return result;
        }

        if (hasPendingShowtime) {
            result.put("canReview", false);
            result.put("reason", "SHOWTIME_NOT_ENDED");
            result.put("message", "Suất chiếu của bạn chưa kết thúc (hoặc chưa soát vé tại cổng). Bạn vui lòng quay lại đánh giá sau khi thưởng thức xong bộ phim nhé!");
            return result;
        }

        result.put("canReview", false);
        result.put("reason", "NO_VALID_WATCHED_TICKET");
        result.put("message", "Bạn cần hoàn tất buổi xem phim để gửi đánh giá.");
        return result;
    }

    /**
     * 2. SUBMIT REVIEW VỚI AUTOMATED PRE-MODERATION PIPELINE
     */
    public Review createReview(Review request, String userId, String username, String email) throws Exception {
        if (request.getMovieId() == null || request.getMovieId().isBlank()) {
            throw new Exception("Vui lòng chọn bộ phim cần đánh giá.");
        }

        Movie movie = movieRepository.findById(request.getMovieId())
                .orElseThrow(() -> new Exception("Không tìm thấy phim với ID: " + request.getMovieId()));

        // 1. Kiểm tra Cardinality: 1 User chỉ được 1 review cho 1 phim
        Optional<Review> existingOpt = reviewRepository.findByMovieIdAndUserId(movie.getId(), userId);
        if (existingOpt.isPresent()) {
            throw new Exception("Bạn đã đánh giá phim này rồi. Vui lòng chỉnh sửa bài đánh giá hiện có.");
        }

        // 2. Kiểm tra điều kiện Verified Watcher
        Map<String, Object> eligibility = checkEligibility(movie.getId(), userId);
        if (!Boolean.TRUE.equals(eligibility.get("canReview"))) {
            throw new Exception((String) eligibility.get("message"));
        }

        // 3. Rate limiting: chống spam submit quá nhanh
        long nowMs = System.currentTimeMillis();
        Long lastSubmit = userLastSubmitMap.get(userId);
        if (lastSubmit != null && (nowMs - lastSubmit) < 15000) {
            throw new Exception("Bạn đang thao tác quá nhanh. Vui lòng thử lại sau 15 giây.");
        }
        userLastSubmitMap.put(userId, nowMs);

        // 4. Giới hạn dữ liệu đầu vào: Rating (1 đến 10) & Comment (20 đến 1000 ký tự)
        if (request.getRating() == null) {
            throw new Exception("Vui lòng chấm điểm số sao cho phim.");
        }
        if (request.getRating() < 1 || request.getRating() > 10) {
            throw new Exception("Điểm đánh giá phải từ 1 đến 10 (hoặc từ 1 đến 5 sao).");
        }

        if (request.getComment() == null || request.getComment().trim().length() < 20) {
            throw new Exception("Nội dung nhận xét phải có tối thiểu 20 ký tự (chống bình luận ngắn vô nghĩa).");
        }
        if (request.getComment().trim().length() > 1000) {
            throw new Exception("Nội dung nhận xét tối đa 1.000 ký tự.");
        }

        String title = request.getTitle() != null ? request.getTitle().trim() : "";
        if (title.length() > 150) {
            title = title.substring(0, 150);
        }

        String comment = request.getComment().trim();
        List<String> tags = request.getTags() != null ? request.getTags() : new ArrayList<>();
        boolean isSpoiler = Boolean.TRUE.equals(request.getIsSpoiler());
        String bookingId = (String) eligibility.get("bookingId");

        // 5. Automated Pre-moderation Pipeline: Lọc từ khóa cấm, spam, link
        PreModerationResult filterResult = runPreModerationFilter(title + " " + comment);

        Review review = Review.builder()
                .movieId(movie.getId())
                .movieTitle(movie.getTitle())
                .moviePoster(movie.getPosterUrl())
                .userId(userId)
                .userName(username != null && !username.isBlank() ? username : "Khán giả")
                .userEmail(email)
                .bookingId(bookingId)
                .rating(request.getRating())
                .title(title)
                .comment(comment)
                .tags(tags)
                .isSpoiler(isSpoiler)
                .isVerifiedWatcher(true)
                .status(filterResult.status)
                .violationReason(filterResult.violationReason)
                .flaggedKeywords(filterResult.flaggedKeywords)
                .reportCount(0)
                .reportedByUserIds(new ArrayList<>())
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .editDeadline(LocalDateTime.now().plusHours(48))
                .editHistory(new ArrayList<>())
                .likes(0)
                .build();

        Review saved = reviewRepository.save(review);

        // Cập nhật lại điểm trung bình cho Movie
        updateMovieRatingScore(movie.getId());

        return saved;
    }

    /**
     * 3. CHỈNH SỬA ĐÁNH GIÁ (Trong vòng 48h kèm Audit Log)
     */
    public Review updateReview(String reviewId, Review updateRequest, String userId) throws Exception {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new Exception("Không tìm thấy bài đánh giá."));

        if (!review.getUserId().equals(userId)) {
            throw new Exception("Bạn không có quyền chỉnh sửa đánh giá này.");
        }

        // Giới hạn 48 giờ
        LocalDateTime deadline = review.getEditDeadline() != null 
                ? review.getEditDeadline() 
                : review.getCreatedAt().plusHours(48);
        if (LocalDateTime.now().isAfter(deadline)) {
            throw new Exception("Đã hết thời hạn cho phép chỉnh sửa đánh giá (tối đa 48 giờ kể từ lúc tạo).");
        }

        if (updateRequest.getRating() == null || updateRequest.getRating() < 1 || updateRequest.getRating() > 10) {
            throw new Exception("Điểm đánh giá phải từ 1 đến 10.");
        }
        if (updateRequest.getComment() == null || updateRequest.getComment().trim().length() < 20) {
            throw new Exception("Nội dung nhận xét tối thiểu 20 ký tự.");
        }
        if (updateRequest.getComment().trim().length() > 1000) {
            throw new Exception("Nội dung nhận xét tối đa 1.000 ký tự.");
        }

        // Lưu Audit Log
        if (review.getEditHistory() == null) {
            review.setEditHistory(new ArrayList<>());
        }
        Review.EditAuditLog auditLog = Review.EditAuditLog.builder()
                .version(review.getEditHistory().size() + 1)
                .previousRating(review.getRating())
                .previousTitle(review.getTitle())
                .previousComment(review.getComment())
                .previousIsSpoiler(review.getIsSpoiler())
                .editedAt(LocalDateTime.now())
                .build();
        review.getEditHistory().add(auditLog);

        String newTitle = updateRequest.getTitle() != null ? updateRequest.getTitle().trim() : "";
        String newComment = updateRequest.getComment().trim();

        // Chạy lại pipeline kiểm duyệt
        PreModerationResult filterResult = runPreModerationFilter(newTitle + " " + newComment);

        review.setRating(updateRequest.getRating());
        review.setTitle(newTitle);
        review.setComment(newComment);
        if (updateRequest.getTags() != null) {
            review.setTags(updateRequest.getTags());
        }
        review.setIsSpoiler(Boolean.TRUE.equals(updateRequest.getIsSpoiler()));
        review.setStatus(filterResult.status);
        review.setViolationReason(filterResult.violationReason);
        review.setFlaggedKeywords(filterResult.flaggedKeywords);
        review.setUpdatedAt(LocalDateTime.now());

        Review saved = reviewRepository.save(review);
        updateMovieRatingScore(review.getMovieId());
        return saved;
    }

    /**
     * 4. BÁO CÁO VI PHẠM TỪ CỘNG ĐỒNG (Community Report)
     * Đạt ngưỡng >= 3 report -> Tự động chuyển PENDING_MODERATION
     */
    public Map<String, Object> reportReview(String reviewId, String reporterUserId, String reason, String description) throws Exception {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new Exception("Không tìm thấy bài đánh giá."));

        if (review.getUserId().equals(reporterUserId)) {
            throw new Exception("Bạn không thể tự báo cáo đánh giá của chính mình.");
        }

        // Kiểm tra xem user này đã từng report review này chưa (1 người chỉ report 1 lần)
        Optional<ReviewReport> existingReport = reviewReportRepository.findByReviewIdAndReporterUserId(reviewId, reporterUserId);
        if (existingReport.isPresent() || (review.getReportedByUserIds() != null && review.getReportedByUserIds().contains(reporterUserId))) {
            throw new Exception("Bạn đã gửi báo cáo vi phạm cho đánh giá này rồi.");
        }

        User reporter = userRepository.findById(reporterUserId).orElse(null);

        ReviewReport report = ReviewReport.builder()
                .reviewId(reviewId)
                .movieId(review.getMovieId())
                .reporterUserId(reporterUserId)
                .reporterUserName(reporter != null ? reporter.getUsername() : "Thành viên")
                .reporterEmail(reporter != null ? reporter.getEmail() : "")
                .reason(reason != null ? reason : "OTHER")
                .description(description != null ? description.trim() : "")
                .createdAt(LocalDateTime.now())
                .build();
        reviewReportRepository.save(report);

        if (review.getReportedByUserIds() == null) {
            review.setReportedByUserIds(new ArrayList<>());
        }
        review.getReportedByUserIds().add(reporterUserId);
        int currentReports = (review.getReportCount() != null ? review.getReportCount() : 0) + 1;
        review.setReportCount(currentReports);

        boolean movedToModeration = false;
        // Nếu đạt ngưỡng >= 3 lượt report -> Tự động chuyển sang PENDING_MODERATION
        if (currentReports >= 3 && "PUBLISHED".equalsIgnoreCase(review.getStatus())) {
            review.setStatus("PENDING_MODERATION");
            review.setViolationReason("Bị cộng đồng báo cáo vi phạm nhiều lần (" + currentReports + " lượt báo cáo).");
            movedToModeration = true;
        }

        reviewRepository.save(review);
        updateMovieRatingScore(review.getMovieId());

        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("reportCount", currentReports);
        resp.put("movedToModeration", movedToModeration);
        resp.put("message", "Cảm ơn bạn đã đóng góp xây dựng cộng đồng văn minh. Chúng tôi đã ghi nhận báo cáo!");
        return resp;
    }

    /**
     * 5. THAO TÁC CỦA MANAGER (Moderation Queue & Actions)
     */
    // Lấy danh sách hàng đợi kiểm duyệt (PENDING_MODERATION hoặc có report)
    public List<Review> getModerationQueue() {
        return reviewRepository.findByStatusInOrderByCreatedAtDesc(Arrays.asList("PENDING_MODERATION", "PENDING"));
    }

    // Phê duyệt (Approve)
    public Review approveReview(String reviewId) throws Exception {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new Exception("Không tìm thấy đánh giá: " + reviewId));
        review.setStatus("PUBLISHED");
        review.setViolationReason(null);
        review.setUpdatedAt(LocalDateTime.now());
        Review saved = reviewRepository.save(review);
        updateMovieRatingScore(review.getMovieId());
        return saved;
    }

    // Từ chối (Reject)
    public Review rejectReview(String reviewId, String reason) throws Exception {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new Exception("Không tìm thấy đánh giá: " + reviewId));
        review.setStatus("REJECTED");
        review.setViolationReason(reason != null && !reason.isBlank() ? reason : "Nội dung vi phạm tiêu chuẩn cộng đồng");
        review.setUpdatedAt(LocalDateTime.now());
        Review saved = reviewRepository.save(review);
        updateMovieRatingScore(review.getMovieId());
        return saved;
    }

    // Mask Spoiler & Approve (Gắn cờ Spoiler bắt buộc và duyệt)
    public Review maskSpoilerAndApprove(String reviewId) throws Exception {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new Exception("Không tìm thấy đánh giá: " + reviewId));
        review.setIsSpoiler(true);
        review.setStatus("PUBLISHED");
        review.setViolationReason(null);
        review.setUpdatedAt(LocalDateTime.now());
        Review saved = reviewRepository.save(review);
        updateMovieRatingScore(review.getMovieId());
        return saved;
    }

    // Khóa quyền đánh giá của User (7 ngày, 30 ngày, vĩnh viễn)
    public Map<String, Object> restrictUserReviewPermission(String targetUserId, int days, String reason) throws Exception {
        User user = userRepository.findById(targetUserId)
                .orElseThrow(() -> new Exception("Không tìm thấy người dùng."));

        user.setReviewRestricted(true);
        user.setReviewRestrictedReason(reason != null ? reason : "Vi phạm quy tắc đánh giá liên tục.");
        if (days > 0) {
            Date until = Date.from(LocalDateTime.now().plusDays(days).atZone(ZoneId.systemDefault()).toInstant());
            user.setReviewRestrictedUntil(until);
        } else {
            // Khóa vĩnh viễn
            Date forever = Date.from(LocalDateTime.now().plusYears(50).atZone(ZoneId.systemDefault()).toInstant());
            user.setReviewRestrictedUntil(forever);
        }
        userRepository.save(user);

        return Map.of("success", true, "message", "Đã khóa quyền đánh giá của user thành công.");
    }

    // Mở khóa quyền đánh giá cho user
    public Map<String, Object> unrestrictUserReviewPermission(String targetUserId) throws Exception {
        User user = userRepository.findById(targetUserId)
                .orElseThrow(() -> new Exception("Không tìm thấy người dùng."));
        user.setReviewRestricted(false);
        user.setReviewRestrictedUntil(null);
        user.setReviewRestrictedReason(null);
        userRepository.save(user);
        return Map.of("success", true, "message", "Đã mở khóa quyền đánh giá cho user.");
    }

    // Lấy chi tiết các report của một review
    public List<ReviewReport> getReportsForReview(String reviewId) {
        return reviewReportRepository.findByReviewIdOrderByCreatedAtDesc(reviewId);
    }

    /**
     * 6. LẤY REVIEWS CÔNG KHAI (Chỉ các review PUBLISHED)
     */
    public List<Review> getMovieReviews(String movieId) {
        return reviewRepository.findByMovieIdAndStatusOrderByCreatedAtDesc(movieId, "PUBLISHED");
    }

    public Optional<Review> getUserReviewForMovie(String movieId, String userId) {
        return reviewRepository.findByMovieIdAndUserId(movieId, userId);
    }

    /**
     * 7. THỐNG KÊ ĐÁNH GIÁ (Stats)
     * Thang điểm 1-10 & Thang điểm 5 sao tương ứng
     */
    public Map<String, Object> getMovieReviewStats(String movieId) {
        List<Review> publishedReviews = reviewRepository.findByMovieIdAndStatusOrderByCreatedAtDesc(movieId, "PUBLISHED");
        int total = publishedReviews.size();
        double avgScore10 = 0.0;
        double avgStars5 = 0.0;
        Map<Integer, Long> distribution = new HashMap<>();
        for (int i = 1; i <= 5; i++) distribution.put(i, 0L);

        if (total > 0) {
            double sumRating = 0.0;
            for (Review r : publishedReviews) {
                int score = r.getRating() != null ? r.getRating() : 10;
                sumRating += score;
                // Quy về thang 5 sao cho thanh phân bố: score 1-2 -> 1 sao, 3-4 -> 2 sao, 5-6 -> 3 sao, 7-8 -> 4 sao, 9-10 -> 5 sao
                // Hoặc nếu data cũ lưu 1-5 sao:
                int starBucket = score <= 5 ? score : (int) Math.ceil(score / 2.0);
                if (starBucket < 1) starBucket = 1;
                if (starBucket > 5) starBucket = 5;
                distribution.put(starBucket, distribution.getOrDefault(starBucket, 0L) + 1);
            }
            avgScore10 = Math.round((sumRating / total) * 10.0) / 10.0;
            avgStars5 = Math.round((avgScore10 / 2.0) * 10.0) / 10.0;
            // Nếu data cũ là thang 5 thì giữ đúng thang 5
            if (avgScore10 <= 5.0 && sumRating / total <= 5.0) {
                avgStars5 = avgScore10;
                avgScore10 = avgStars5 * 2.0;
            }
        }

        Map<String, Object> stats = new HashMap<>();
        stats.put("movieId", movieId);
        stats.put("averageRating", avgStars5); // Thang 5 sao cho UI cũ
        stats.put("averageScore", avgScore10); // Thang 10 điểm cho chuẩn mới
        stats.put("totalReviews", total);
        stats.put("distribution", distribution);
        return stats;
    }

    /**
     * 8. TÍNH TOÁN & CẬP NHẬT ĐIỂM TRUNG BÌNH VÀO MOVIE (Aggregated Rating)
     */
    public void updateMovieRatingScore(String movieId) {
        try {
            Optional<Movie> movieOpt = movieRepository.findById(movieId);
            if (movieOpt.isEmpty()) return;

            Movie movie = movieOpt.get();
            List<Review> publishedReviews = reviewRepository.findByMovieIdAndStatusOrderByCreatedAtDesc(movieId, "PUBLISHED");
            int total = publishedReviews.size();
            double avgStars = 5.0;

            if (total > 0) {
                double sum = 0.0;
                for (Review r : publishedReviews) {
                    int score = r.getRating() != null ? r.getRating() : 10;
                    if (score <= 5) {
                        sum += score;
                    } else {
                        sum += (score / 2.0);
                    }
                }
                avgStars = Math.round((sum / total) * 10.0) / 10.0;
            }

            movie.setAverageRating(avgStars);
            movie.setReviewCount(total);
            movieRepository.save(movie);
        } catch (Exception e) {
            System.err.println("Lỗi khi cập nhật điểm trung bình phim: " + e.getMessage());
        }
    }

    /**
     * 9. LẤY TẤT CẢ REVIEWS CHO QUẢN TRỊ (Admin/Manager)
     */
    public List<Review> getAllReviewsForAdmin(String movieId, String status, Integer rating, String search) {
        List<Review> list = reviewRepository.findAllByOrderByCreatedAtDesc();

        return list.stream().filter(r -> {
            if (movieId != null && !movieId.isBlank() && !movieId.equals(r.getMovieId())) return false;
            if (status != null && !status.isBlank() && !status.equalsIgnoreCase("ALL") && !status.equalsIgnoreCase(r.getStatus())) return false;
            if (rating != null && rating > 0 && !rating.equals(r.getRating())) return false;
            if (search != null && !search.isBlank()) {
                String q = search.toLowerCase();
                boolean matchUser = r.getUserName() != null && r.getUserName().toLowerCase().contains(q);
                boolean matchMovie = r.getMovieTitle() != null && r.getMovieTitle().toLowerCase().contains(q);
                boolean matchComment = r.getComment() != null && r.getComment().toLowerCase().contains(q);
                boolean matchTitle = r.getTitle() != null && r.getTitle().toLowerCase().contains(q);
                if (!matchUser && !matchMovie && !matchComment && !matchTitle) return false;
            }
            return true;
        }).collect(Collectors.toList());
    }

    public void deleteReview(String reviewId) throws Exception {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new Exception("Không tìm thấy đánh giá với ID: " + reviewId));
        String movieId = review.getMovieId();
        reviewReportRepository.deleteByReviewId(reviewId);
        reviewRepository.deleteById(reviewId);
        updateMovieRatingScore(movieId);
    }

    /**
     * 10. GỢI Ý PHIM DỰA TRÊN ĐIỂM ĐÁNH GIÁ CAO
     */
    public List<Map<String, Object>> getRecommendedMovies(String excludeMovieId, int limit) {
        List<Movie> allMovies = movieRepository.findAll();
        List<Review> allPublishedReviews = reviewRepository.findByStatusOrderByCreatedAtDesc("PUBLISHED");

        Map<String, List<Review>> movieReviewsMap = allPublishedReviews.stream()
                .collect(Collectors.groupingBy(Review::getMovieId));

        List<Map<String, Object>> recommendedList = new ArrayList<>();

        for (Movie m : allMovies) {
            if (excludeMovieId != null && m.getId().equals(excludeMovieId)) continue;
            if ("DISABLED".equalsIgnoreCase(m.getStatus())) continue;

            List<Review> reviews = movieReviewsMap.getOrDefault(m.getId(), Collections.emptyList());
            double avgRating = m.getAverageRating() != null ? m.getAverageRating() : 5.0;

            Map<String, Object> item = new HashMap<>();
            item.put("id", m.getId());
            item.put("title", m.getTitle());
            item.put("posterUrl", m.getPosterUrl());
            item.put("genres", m.getGenres());
            item.put("duration", m.getDuration());
            item.put("ageRating", m.getAgeRating());
            item.put("status", m.getStatus());
            item.put("averageRating", avgRating);
            item.put("reviewCount", reviews.size());
            recommendedList.add(item);
        }

        recommendedList.sort((a, b) -> {
            Double ratingA = (Double) a.get("averageRating");
            Double ratingB = (Double) b.get("averageRating");
            int ratingCmp = ratingB.compareTo(ratingA);
            if (ratingCmp != 0) return ratingCmp;
            Integer countA = (Integer) a.get("reviewCount");
            Integer countB = (Integer) b.get("reviewCount");
            return countB.compareTo(countA);
        });

        if (recommendedList.size() > limit) {
            return recommendedList.subList(0, limit);
        }
        return recommendedList;
    }

    /**
     * PIPELINE KIỂM DUYỆT TỰ ĐỘNG (Pre-moderation Filter)
     */
    private static class PreModerationResult {
        String status;
        String violationReason;
        List<String> flaggedKeywords = new ArrayList<>();
    }

    private PreModerationResult runPreModerationFilter(String text) {
        PreModerationResult result = new PreModerationResult();
        String lower = text.toLowerCase();

        // 1. Kiểm tra từ cấm nặng (Severe profanity) -> REJECTED
        for (String word : SEVERE_PROFANITY_WORDS) {
            if (lower.contains(word)) {
                result.status = "REJECTED";
                result.violationReason = "Vi phạm nghiêm trọng tiêu chuẩn cộng đồng: Chứa từ ngữ thô tục / cờ bạc lừa đảo";
                result.flaggedKeywords.add(word);
                return result;
            }
        }

        // 2. Kiểm tra link độc / số điện thoại / mạng xã hội -> PENDING_MODERATION
        boolean hasUrl = URL_PATTERN.matcher(text).find();
        boolean hasPhone = PHONE_PATTERN.matcher(text).find();
        boolean hasSocial = SOCIAL_PATTERN.matcher(text).find();

        if (hasUrl || hasPhone || hasSocial) {
            result.status = "PENDING_MODERATION";
            result.violationReason = "Nghi vấn phát tán liên kết ngoài, số điện thoại hoặc tài khoản liên hệ";
            if (hasUrl) result.flaggedKeywords.add("[URL]");
            if (hasPhone) result.flaggedKeywords.add("[SĐT]");
            if (hasSocial) result.flaggedKeywords.add("[Mạng Xã Hội]");
            return result;
        }

        // 3. Kiểm tra từ ngữ đối thủ / nghi vấn -> PENDING_MODERATION
        for (String word : SUSPICIOUS_WORDS) {
            if (lower.contains(word)) {
                result.status = "PENDING_MODERATION";
                result.violationReason = "Chứa từ khóa nghi vấn cần người kiểm duyệt (" + word + ")";
                result.flaggedKeywords.add(word);
                return result;
            }
        }

        // Sạch, không vi phạm -> PUBLISHED
        result.status = "PUBLISHED";
        return result;
    }
}
