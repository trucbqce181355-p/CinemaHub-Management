package com.example.cinemahub.controller;

import com.example.cinemahub.model.Notification;
import com.example.cinemahub.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@CrossOrigin(origins = "*")
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    /**
     * 1. XEM DANH SÁCH THÔNG BÁO CỦA TÀI KHOẢN (View In-App Notifications)
     */
    @GetMapping
    public ResponseEntity<?> getUserNotifications(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).body(Map.of("error", "Vui lòng đăng nhập để xem thông báo"));
        }
        String userId = authentication.getName();
        List<Notification> list = notificationService.getUserNotifications(userId);
        return ResponseEntity.ok(list);
    }

    /**
     * 2. LẤY SỐ LƯỢNG THÔNG BÁO CHƯA ĐỌC
     */
    @GetMapping("/unread-count")
    public ResponseEntity<?> getUnreadCount(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.ok(Map.of("unreadCount", 0));
        }
        String userId = authentication.getName();
        long count = notificationService.getUnreadCount(userId);
        return ResponseEntity.ok(Map.of("unreadCount", count));
    }

    /**
     * 3. ĐÁNH DẤU 1 THÔNG BÁO ĐÃ ĐỌC (Mark Notification as Read)
     */
    @PutMapping("/{id}/read")
    public ResponseEntity<?> markAsRead(@PathVariable String id, Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).body(Map.of("error", "Chưa xác thực"));
        }
        try {
            String userId = authentication.getName();
            Notification updated = notificationService.markAsRead(id, userId);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * 4. ĐÁNH DẤU TẤT CẢ THÔNG BÁO ĐÃ ĐỌC (Mark All as Read)
     */
    @PutMapping("/read-all")
    public ResponseEntity<?> markAllAsRead(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).body(Map.of("error", "Chưa xác thực"));
        }
        String userId = authentication.getName();
        notificationService.markAllAsRead(userId);
        return ResponseEntity.ok(Map.of("message", "Đã đánh dấu tất cả thông báo là đã đọc"));
    }

    /**
     * 5. GỬI TỰ ĐỘNG / KÍCH HOẠT NHẮC NHỞ SUẤT CHIẾU (Send Automated Showtime Reminder)
     */
    @PostMapping("/trigger-reminders")
    public ResponseEntity<?> triggerReminders() {
        try {
            int sent = notificationService.sendAutomatedShowtimeReminders();
            return ResponseEntity.ok(Map.of(
                    "message", "Đã quét và gửi " + sent + " lời nhắc suất chiếu thành công.",
                    "sentCount", sent
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * 6. THÔNG BÁO MỞ BÁN VÉ CHO PHIM SẮP CHIẾU (Notify Ticket Opening for Coming-Soon Movies)
     */
    @PostMapping("/notify-ticket-opening/{movieId}")
    public ResponseEntity<?> notifyTicketOpening(@PathVariable String movieId) {
        try {
            Notification notif = notificationService.notifyTicketOpeningForComingSoonMovies(movieId);
            return ResponseEntity.ok(Map.of(
                    "message", "Đã gửi thông báo mở bán vé cho khán giả thành công",
                    "notification", notif
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}

