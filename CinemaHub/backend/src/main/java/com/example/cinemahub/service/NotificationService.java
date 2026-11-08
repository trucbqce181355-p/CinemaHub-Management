package com.example.cinemahub.service;

import com.example.cinemahub.model.Booking;
import com.example.cinemahub.model.Movie;
import com.example.cinemahub.model.Notification;
import com.example.cinemahub.repository.BookingRepository;
import com.example.cinemahub.repository.MovieRepository;
import com.example.cinemahub.repository.NotificationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class NotificationService {

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private MovieRepository movieRepository;

    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm, dd/MM/yyyy");

    public List<Notification> getUserNotifications(String userId) {
        if (userId == null || userId.isBlank()) {
            return Collections.emptyList();
        }
        return notificationRepository.findByUserIdInOrderByCreatedAtDesc(Arrays.asList(userId, "ALL"));
    }

    public long getUnreadCount(String userId) {
        if (userId == null || userId.isBlank()) {
            return 0;
        }
        long userUnread = notificationRepository.countByUserIdAndIsReadFalse(userId);
        long broadcastUnread = notificationRepository.countByUserIdAndIsReadFalse("ALL");
        return userUnread + broadcastUnread;
    }

    public Notification markAsRead(String notificationId, String userId) throws Exception {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new Exception("Không tìm thấy thông báo với ID: " + notificationId));
        
        notification.setIsRead(true);
        return notificationRepository.save(notification);
    }

    public void markAllAsRead(String userId) {
        if (userId == null || userId.isBlank()) return;
        List<Notification> list = notificationRepository.findByUserIdInOrderByCreatedAtDesc(Arrays.asList(userId, "ALL"));
        for (Notification n : list) {
            if (!Boolean.TRUE.equals(n.getIsRead())) {
                n.setIsRead(true);
                notificationRepository.save(n);
            }
        }
    }

    public Notification createNotification(String userId, String title, String message, String type, String link, Map<String, Object> metadata) {
        Notification notification = Notification.builder()
                .userId(userId)
                .title(title)
                .message(message)
                .type(type)
                .link(link)
                .isRead(false)
                .createdAt(LocalDateTime.now())
                .metadata(metadata)
                .build();
        return notificationRepository.save(notification);
    }

    /**
     * Tự động gửi thông báo nhắc nhở suất chiếu (Automated Showtime Reminder)
     * Quét định kỳ mỗi 5 phút hoặc kích hoạt thủ công
     */
    @Scheduled(fixedRate = 300000)
    public int sendAutomatedShowtimeReminders() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime reminderWindowEnd = now.plusHours(2);

        List<Booking> confirmedBookings = bookingRepository.findAll().stream()
                .filter(b -> "CONFIRMED".equalsIgnoreCase(b.getStatus()))
                .filter(b -> b.getUserId() != null && !b.getUserId().isBlank())
                .filter(b -> b.getShowtimeStart() != null)
                .filter(b -> b.getShowtimeStart().isAfter(now) && b.getShowtimeStart().isBefore(reminderWindowEnd))
                .toList();

        int sentCount = 0;
        for (Booking b : confirmedBookings) {
            String showtimeId = b.getShowtimeId();
            if (showtimeId == null) continue;

            List<Notification> existing = notificationRepository.findRemindersByShowtime(
                    b.getUserId(), "SHOWTIME_REMINDER", showtimeId);

            if (existing == null || existing.isEmpty()) {
                String formattedTime = b.getShowtimeStart().format(TIME_FORMATTER);
                String movieTitle = b.getMovieTitle() != null ? b.getMovieTitle() : "Phim";
                String cinemaName = b.getCinemaName() != null ? b.getCinemaName() : "Rạp chiếu";
                String roomName = b.getRoomName() != null ? b.getRoomName() : "Phòng chiếu";

                Map<String, Object> metadata = new HashMap<>();
                metadata.put("showtimeId", showtimeId);
                metadata.put("bookingId", b.getId());
                metadata.put("movieTitle", movieTitle);

                createNotification(
                        b.getUserId(),
                        "Nhắc nhở suất chiếu sắp diễn ra: " + movieTitle,
                        "Suất chiếu phim \"" + movieTitle + "\" tại " + cinemaName + " (" + roomName + ") sẽ bắt đầu lúc " + formattedTime + ". Vui lòng có mặt trước 15 phút để chuẩn bị vé vào phòng!",
                        "SHOWTIME_REMINDER",
                        "/profile",
                        metadata
                );
                sentCount++;
            }
        }
        return sentCount;
    }

    /**
     * Thông báo mở bán vé cho phim sắp chiếu (Notify Ticket Opening for Coming-Soon Movies)
     */
    public Notification notifyTicketOpeningForComingSoonMovies(String movieId) throws Exception {
        Movie movie = movieRepository.findById(movieId)
                .orElseThrow(() -> new Exception("Không tìm thấy phim với ID: " + movieId));

        Map<String, Object> metadata = new HashMap<>();
        metadata.put("movieId", movie.getId());
        metadata.put("movieTitle", movie.getTitle());

        return createNotification(
                "ALL",
                "Phim mới mở bán vé: " + movie.getTitle(),
                "Bộ phim siêu phẩm \"" + movie.getTitle() + "\" đã chính thức mở bán vé! Đặt vé ngay hôm nay để chọn cho mình vị trí ngồi đẹp nhất.",
                "TICKET_OPENING",
                "/movies/" + movie.getId(),
                metadata
        );
    }
}

