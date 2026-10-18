package com.example.cinemahub.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "reviews")
public class Review {
    @Id
    private String id;

    private String movieId;
    private String movieTitle;
    private String moviePoster;

    private String userId;
    private String userName;
    private String userEmail;

    // Ràng buộc 1 review gắn liền với 1 booking cụ thể của khách
    private String bookingId;

    // Rating score: 1 đến 10 (tương ứng 0.5 đến 5.0 sao)
    private Integer rating;

    // Tiêu đề nhận xét ngắn (tối đa 150 ký tự)
    private String title;

    // Nội dung nhận xét (20 đến 1000 ký tự)
    private String comment;

    // Tag cảm xúc: "Hài hước", "Kịch tính", "Đồ họa đỉnh", "Cảm động", "Kinh dị"...
    @Builder.Default
    private List<String> tags = new ArrayList<>();

    // Cờ cảnh báo tiết lộ tình tiết phim quan trọng (Spoilers)
    @Builder.Default
    private Boolean isSpoiler = false;

    // Huy hiệu Verified Watcher (Khán giả đã xem tại rạp)
    @Builder.Default
    private Boolean isVerifiedWatcher = true;

    // Vòng đời trạng thái: PUBLISHED, PENDING_MODERATION, REJECTED, HIDDEN
    @Builder.Default
    private String status = "PUBLISHED";

    // Lý do từ chối kiểm duyệt (nếu REJECTED hoặc HIDDEN)
    private String violationReason;

    // Danh sách từ khóa nghi vấn / spam phát hiện tự động bởi pre-moderation pipeline
    @Builder.Default
    private List<String> flaggedKeywords = new ArrayList<>();

    // Số lượt báo cáo vi phạm từ cộng đồng
    @Builder.Default
    private Integer reportCount = 0;

    // Danh sách các user_id đã báo cáo (đảm bảo 1 user chỉ report 1 lần)
    @Builder.Default
    private List<String> reportedByUserIds = new ArrayList<>();

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    // Hạn chót chỉnh sửa (48 giờ kể từ lúc tạo)
    private LocalDateTime editDeadline;

    // Lịch sử chỉnh sửa (Audit Log)
    @Builder.Default
    private List<EditAuditLog> editHistory = new ArrayList<>();

    @Builder.Default
    private Integer likes = 0;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EditAuditLog {
        private int version;
        private Integer previousRating;
        private String previousTitle;
        private String previousComment;
        private Boolean previousIsSpoiler;
        private LocalDateTime editedAt;
    }
}
