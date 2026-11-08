package com.example.cinemahub.service;

import com.example.cinemahub.model.Booking;
import com.example.cinemahub.model.Movie;
import com.example.cinemahub.model.Notification;
import com.example.cinemahub.repository.BookingRepository;
import com.example.cinemahub.repository.MovieRepository;
import com.example.cinemahub.repository.NotificationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class NotificationServiceTest {

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private MovieRepository movieRepository;

    @InjectMocks
    private NotificationService notificationService;

    private String userId = "user123";

    @Test
    @DisplayName("Lấy danh sách thông báo của user thành công")
    void testGetUserNotifications() {
        Notification notif1 = Notification.builder().id("1").userId(userId).title("Title 1").isRead(false).build();
        Notification notif2 = Notification.builder().id("2").userId("ALL").title("Broadcast").isRead(false).build();

        when(notificationRepository.findByUserIdInOrderByCreatedAtDesc(Arrays.asList(userId, "ALL")))
                .thenReturn(List.of(notif1, notif2));

        List<Notification> list = notificationService.getUserNotifications(userId);

        assertEquals(2, list.size());
        verify(notificationRepository, times(1)).findByUserIdInOrderByCreatedAtDesc(Arrays.asList(userId, "ALL"));
    }

    @Test
    @DisplayName("Tính tổng số lượng thông báo chưa đọc chính xác")
    void testGetUnreadCount() {
        when(notificationRepository.countByUserIdAndIsReadFalse(userId)).thenReturn(3L);
        when(notificationRepository.countByUserIdAndIsReadFalse("ALL")).thenReturn(1L);

        long count = notificationService.getUnreadCount(userId);

        assertEquals(4L, count);
    }

    @Test
    @DisplayName("Đánh dấu thông báo đã đọc thành công")
    void testMarkAsRead() throws Exception {
        Notification notif = Notification.builder().id("notif1").userId(userId).isRead(false).build();
        when(notificationRepository.findById("notif1")).thenReturn(Optional.of(notif));
        when(notificationRepository.save(any(Notification.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Notification result = notificationService.markAsRead("notif1", userId);

        assertTrue(result.getIsRead());
        verify(notificationRepository, times(1)).save(notif);
    }

    @Test
    @DisplayName("Thông báo mở bán vé cho phim mới thành công")
    void testNotifyTicketOpening() throws Exception {
        Movie movie = new Movie();
        movie.setId("movie123");
        movie.setTitle("Avatar 3");

        when(movieRepository.findById("movie123")).thenReturn(Optional.of(movie));
        when(notificationRepository.save(any(Notification.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Notification notif = notificationService.notifyTicketOpeningForComingSoonMovies("movie123");

        assertNotNull(notif);
        assertEquals("ALL", notif.getUserId());
        assertEquals("TICKET_OPENING", notif.getType());
        assertTrue(notif.getTitle().contains("Avatar 3"));
    }

    @Test
    @DisplayName("Tự động gửi nhắc nhở cho suất chiếu sắp bắt đầu")
    void testSendAutomatedShowtimeReminders() {
        LocalDateTime now = LocalDateTime.now();
        Booking booking = Booking.builder()
                .id("booking1")
                .userId(userId)
                .showtimeId("st123")
                .movieTitle("Batman")
                .cinemaName("CGV Landmark")
                .roomName("Room 1")
                .showtimeStart(now.plusMinutes(45))
                .status("CONFIRMED")
                .build();

        when(bookingRepository.findAll()).thenReturn(List.of(booking));
        when(notificationRepository.findRemindersByShowtime(userId, "SHOWTIME_REMINDER", "st123"))
                .thenReturn(Collections.emptyList());
        when(notificationRepository.save(any(Notification.class))).thenAnswer(invocation -> invocation.getArgument(0));

        int sent = notificationService.sendAutomatedShowtimeReminders();

        assertEquals(1, sent);
        verify(notificationRepository, times(1)).save(any(Notification.class));
    }
}

