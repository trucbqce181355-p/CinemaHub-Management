package com.example.cinemahub.service;

import com.example.cinemahub.dto.AutoGenerateShowtimesRequest;
import com.example.cinemahub.model.Cinema;
import com.example.cinemahub.model.Movie;
import com.example.cinemahub.model.ScreenRoom;
import com.example.cinemahub.model.Showtime;
import com.example.cinemahub.model.Ticket;
import com.example.cinemahub.repository.CinemaRepository;
import com.example.cinemahub.repository.MovieRepository;
import com.example.cinemahub.repository.ScreenRoomRepository;
import com.example.cinemahub.repository.ShowtimeRepository;
import com.example.cinemahub.repository.TicketRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.Callable;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class ShowtimeServiceTest {

    @Mock
    private AdmissionCoordinator admission;

    @Mock
    private ShowtimeRepository showtimeRepository;

    @Mock
    private MovieRepository movieRepository;

    @Mock
    private CinemaRepository cinemaRepository;

    @Mock
    private ScreenRoomRepository screenRoomRepository;

    @Mock
    private TicketRepository ticketRepository;

    @InjectMocks
    private ShowtimeService showtimeService;

    private Movie mockMovie;
    private Cinema mockCinema;
    private ScreenRoom mockRoom;

    @BeforeEach
    void setUp() throws Exception {
        lenient().when(admission.writeChecked(any())).thenAnswer(invocation -> {
            Callable<?> callable = invocation.getArgument(0);
            return callable.call();
        });

        mockMovie = new Movie();
        mockMovie.setId("movie1");
        mockMovie.setTitle("Test Movie");
        mockMovie.setDuration(120);
        mockMovie.setStandardPrice(90000.0);

        mockCinema = new Cinema();
        mockCinema.setId("cinema1");
        mockCinema.setName("CGV Test");

        mockRoom = new ScreenRoom();
        mockRoom.setId("room1");
        mockRoom.setName("Room 1");
        mockRoom.setScreenType("IMAX");
    }

    @Test
    @DisplayName("Tạo suất chiếu thành công khi không có xung đột")
    void testCreateShowtimeSuccess() throws Exception {
        Showtime st = new Showtime();
        st.setMovieId("movie1");
        st.setRoomId("room1");
        st.setStartTime(LocalDateTime.now().plusHours(3));

        when(movieRepository.findById("movie1")).thenReturn(Optional.of(mockMovie));
        when(screenRoomRepository.findById("room1")).thenReturn(Optional.of(mockRoom));
        when(showtimeRepository.findByRoomId("room1")).thenReturn(Collections.emptyList());
        when(showtimeRepository.save(any(Showtime.class))).thenAnswer(i -> i.getArgument(0));

        Showtime created = showtimeService.createShowtime(st);

        assertNotNull(created);
        assertTrue("ACTIVE".equalsIgnoreCase(created.getStatus()));
        assertEquals("IMAX", created.getFormat());
        assertEquals(st.getStartTime().plusMinutes(120), created.getEndTime());
    }

    @Test
    @DisplayName("Bắt lỗi xung đột khi 2 suất chiếu bị trùng thời gian trong cùng phòng")
    void testCreateShowtimeConflict() {
        LocalDateTime baseTime = LocalDateTime.now().plusHours(3);

        Showtime existing = new Showtime();
        existing.setId("existing1");
        existing.setRoomId("room1");
        existing.setStartTime(baseTime);
        existing.setEndTime(baseTime.plusMinutes(120));
        existing.setStatus("ACTIVE");

        Showtime newSt = new Showtime();
        newSt.setMovieId("movie1");
        newSt.setRoomId("room1");
        newSt.setStartTime(baseTime.plusMinutes(30)); // Overlap

        when(movieRepository.findById("movie1")).thenReturn(Optional.of(mockMovie));
        when(screenRoomRepository.findById("room1")).thenReturn(Optional.of(mockRoom));
        when(showtimeRepository.findByRoomId("room1")).thenReturn(List.of(existing));

        Exception exception = assertThrows(Exception.class, () -> {
            showtimeService.createShowtime(newSt);
        });

        assertTrue(exception.getMessage().contains("Thời gian chiếu bị trùng"));
    }

    @Test
    @DisplayName("Bảo đảm buffer 15 phút dọn dẹp (Break Time) giữa các suất chiếu")
    void testBreakTimeBufferConflict() {
        LocalDateTime baseTime = LocalDateTime.now().plusHours(3);

        Showtime existing = new Showtime();
        existing.setId("existing1");
        existing.setRoomId("room1");
        existing.setStartTime(baseTime);
        existing.setEndTime(baseTime.plusMinutes(120)); // End: baseTime + 120
        existing.setStatus("ACTIVE");

        Showtime newSt = new Showtime();
        newSt.setMovieId("movie1");
        newSt.setRoomId("room1");
        // Start after existing ends, but only 5 minutes later (< 15 mins break)
        newSt.setStartTime(baseTime.plusMinutes(125));

        when(movieRepository.findById("movie1")).thenReturn(Optional.of(mockMovie));
        when(screenRoomRepository.findById("room1")).thenReturn(Optional.of(mockRoom));
        when(showtimeRepository.findByRoomId("room1")).thenReturn(List.of(existing));

        Exception exception = assertThrows(Exception.class, () -> {
            showtimeService.createShowtime(newSt);
        });

        assertTrue(exception.getMessage().contains("Thời gian chiếu bị trùng"));
    }

    @Test
    @DisplayName("Xóa mềm suất chiếu (Soft delete: đánh dấu isDeleted=true và status=DELETED thay vì xóa khỏi DB)")
    void testSoftDeleteShowtime() throws Exception {
        Showtime st = new Showtime();
        st.setId("st1");
        st.setStatus("ACTIVE");
        st.setIsDeleted(false);

        when(showtimeRepository.findById("st1")).thenReturn(Optional.of(st));
        when(showtimeRepository.save(any(Showtime.class))).thenAnswer(i -> i.getArgument(0));

        showtimeService.deleteShowtime("st1");

        assertTrue(Boolean.TRUE.equals(st.getIsDeleted()));
        assertEquals("DELETED", st.getStatus());
        verify(showtimeRepository, never()).deleteById(anyString());
        verify(showtimeRepository).save(st);
    }

    @Test
    @DisplayName("Tự động tạo suất chiếu (Auto-generate Showtimes) không trùng suất chiếu")
    void testAutoGenerateShowtimes() throws Exception {
        AutoGenerateShowtimesRequest req = new AutoGenerateShowtimesRequest();
        req.setMovieId("movie1");
        req.setCinemaId("cinema1");
        req.setRoomId("room1");
        req.setStartDate(LocalDate.now().plusDays(2));
        req.setEndDate(LocalDate.now().plusDays(2));
        req.setDailyStartTime(LocalTime.of(10, 0));
        req.setDailyEndTime(LocalTime.of(15, 0));
        req.setBreakMinutes(15);
        req.setBasePrice(90000.0);

        when(movieRepository.findById("movie1")).thenReturn(Optional.of(mockMovie));
        when(cinemaRepository.findById("cinema1")).thenReturn(Optional.of(mockCinema));
        when(screenRoomRepository.findById("room1")).thenReturn(Optional.of(mockRoom));
        when(showtimeRepository.findByRoomId("room1")).thenReturn(Collections.emptyList());
        when(showtimeRepository.save(any(Showtime.class))).thenAnswer(i -> i.getArgument(0));

        List<Showtime> generated = showtimeService.autoGenerateShowtimes(req);

        // From 10:00 to 15:00:
        // Slot 1: 10:00 - 12:00
        // Break: 12:00 - 12:15
        // Slot 2: 12:15 - 14:15
        // Break: 14:15 - 14:30
        // Next slot would end at 16:30 > 15:00 -> stops.
        assertEquals(2, generated.size());
        assertEquals(LocalTime.of(10, 0), generated.get(0).getStartTime().toLocalTime());
        assertEquals(LocalTime.of(12, 15), generated.get(1).getStartTime().toLocalTime());
    }

    @Test
    @DisplayName("Chặn tạo lịch tự động nếu ngày bắt đầu nhỏ hơn ngày mai (dưới 24h)")
    void testAutoGenerateBlockedForTodayOrPast() {
        AutoGenerateShowtimesRequest req = new AutoGenerateShowtimesRequest();
        req.setMovieId("movie1");
        req.setCinemaId("cinema1");
        req.setRoomId("room1");
        req.setStartDate(LocalDate.now()); // Hôm nay -> Phải bị chặn!

        Exception exception = assertThrows(Exception.class, () -> {
            showtimeService.autoGenerateShowtimes(req);
        });

        assertTrue(exception.getMessage().contains("ngày hôm sau"));
    }
}
