package com.example.cinemahub.service;

import com.example.cinemahub.dto.AutoGenerateShowtimesRequest;
import com.example.cinemahub.model.Cinema;
import com.example.cinemahub.model.Movie;
import com.example.cinemahub.model.Showtime;
import com.example.cinemahub.model.ScreenRoom;
import com.example.cinemahub.model.Ticket;
import com.example.cinemahub.repository.CinemaRepository;
import com.example.cinemahub.repository.MovieRepository;
import com.example.cinemahub.repository.ShowtimeRepository;
import com.example.cinemahub.repository.ScreenRoomRepository;
import com.example.cinemahub.repository.TicketRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ShowtimeService {
    @Autowired
    private AdmissionCoordinator admission;

    @Autowired
    private ShowtimeRepository showtimeRepository;

    @Autowired
    private MovieRepository movieRepository;

    @Autowired
    private CinemaRepository cinemaRepository;

    @Autowired
    private ScreenRoomRepository screenRoomRepository;

    @Autowired
    private TicketRepository ticketRepository;

    public List<Showtime> getShowtimes(String movieId, String cinemaId, String dateStr, Boolean includePast, Boolean allStatuses) {
        List<Showtime> list;
        if (movieId != null && !movieId.isBlank() && cinemaId != null && !cinemaId.isBlank()) {
            list = showtimeRepository.findByMovieIdAndCinemaId(movieId, cinemaId);
        } else if (movieId != null && !movieId.isBlank()) {
            list = showtimeRepository.findByMovieId(movieId);
        } else if (cinemaId != null && !cinemaId.isBlank()) {
            list = showtimeRepository.findByCinemaId(cinemaId);
        } else {
            list = showtimeRepository.findAll();
        }

        if (dateStr != null && !dateStr.isBlank()) {
            try {
                LocalDate filterDate = LocalDate.parse(dateStr);
                list = list.stream().filter(s -> {
                    if (s.getStartTime() == null) return false;
                    return s.getStartTime().toLocalDate().isEqual(filterDate);
                }).collect(Collectors.toList());
            } catch (Exception ignored) {
            }
        }

        // Filter out past showtimes unless includePast is explicitly true
        if (includePast == null || !includePast) {
            LocalDateTime now = LocalDateTime.now();
            list = list.stream().filter(s -> {
                if (s.getStartTime() == null) return false;
                return s.getStartTime().isAfter(now);
            }).collect(Collectors.toList());
        }

        return list.stream()
                .filter(s -> !Boolean.TRUE.equals(s.getIsDeleted()) && !"DELETED".equalsIgnoreCase(s.getStatus()))
                .filter(s -> (allStatuses != null && allStatuses) || "Active".equalsIgnoreCase(s.getStatus()))
                .sorted((a, b) -> {
                    if (a.getStartTime() == null || b.getStartTime() == null) return 0;
                    return a.getStartTime().compareTo(b.getStartTime());
                })
                .collect(Collectors.toList());
    }

    public List<Showtime> getShowtimes(String movieId, String cinemaId, String dateStr) {
        return getShowtimes(movieId, cinemaId, dateStr, false, false);
    }

    public Showtime getShowtimeById(String id) {
        return showtimeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy suất chiếu với ID: " + id));
    }

    public Showtime createShowtime(Showtime showtime) throws Exception {
        return admission.writeChecked(() -> createShowtimeInternal(showtime));
    }

    private Showtime createShowtimeInternal(Showtime showtime) throws Exception {
        validateShowtime(showtime, null);
        if (showtime.getStatus() == null) {
            showtime.setStatus("Active");
        }
        return showtimeRepository.save(showtime);
    }

    public Showtime updateShowtime(String id, Showtime updated) throws Exception {
        return admission.writeChecked(() -> updateShowtimeInternal(id, updated));
    }

    private Showtime updateShowtimeInternal(String id, Showtime updated) throws Exception {
        Showtime existing = getShowtimeById(id);
        
        validateShowtime(updated, id);
        
        existing.setMovieId(updated.getMovieId());
        existing.setMovieTitle(updated.getMovieTitle());
        existing.setMoviePoster(updated.getMoviePoster());
        existing.setCinemaId(updated.getCinemaId());
        existing.setCinemaName(updated.getCinemaName());
        existing.setRoomId(updated.getRoomId());
        existing.setRoomName(updated.getRoomName());
        existing.setStartTime(updated.getStartTime());
        existing.setEndTime(updated.getEndTime());
        existing.setFormat(updated.getFormat());
        existing.setBasePrice(updated.getBasePrice());
        if (updated.getStatus() != null) {
            existing.setStatus(updated.getStatus());
        }
        
        return showtimeRepository.save(existing);
    }

    public Showtime updateStatus(String id, String status) throws Exception {
        return admission.writeChecked(() -> updateStatusInternal(id, status));
    }

    private Showtime updateStatusInternal(String id, String status) throws Exception {
        Showtime existing = getShowtimeById(id);
        existing.setStatus(status);
        return showtimeRepository.save(existing);
    }

    public void deleteShowtime(String id) throws Exception {
        admission.writeChecked(() -> {
            deleteShowtimeInternal(id);
            return null;
        });
    }

    private void deleteShowtimeInternal(String id) throws Exception {
        Showtime showtime = getShowtimeById(id);
        showtime.setIsDeleted(true);
        showtime.setStatus("DELETED");
        showtimeRepository.save(showtime);
    }

    public List<Showtime> autoGenerateShowtimes(AutoGenerateShowtimesRequest req) throws Exception {
        return admission.writeChecked(() -> autoGenerateShowtimesInternal(req));
    }

    private List<Showtime> autoGenerateShowtimesInternal(AutoGenerateShowtimesRequest req) throws Exception {
        if (req.getMovieId() == null || req.getMovieId().isBlank()) {
            throw new Exception("Vui lòng chọn phim để tạo suất chiếu tự động");
        }
        if (req.getCinemaId() == null || req.getCinemaId().isBlank()) {
            throw new Exception("Vui lòng chọn cụm rạp");
        }
        if (req.getRoomId() == null || req.getRoomId().isBlank()) {
            throw new Exception("Vui lòng chọn phòng chiếu");
        }
        if (req.getStartDate() == null) {
            throw new Exception("Vui lòng chọn ngày bắt đầu tạo suất chiếu");
        }
        LocalDate tomorrow = LocalDate.now().plusDays(1);
        if (req.getStartDate().isBefore(tomorrow)) {
            throw new Exception("Chỉ được tạo suất chiếu từ ngày hôm sau (trước ít nhất 24 giờ). Vui lòng chọn từ ngày mai trở đi.");
        }
        if (req.getBasePrice() != null && req.getBasePrice() < 0) {
            throw new Exception("Giá vé cơ bản không được là số âm.");
        }

        Movie movie = movieRepository.findById(req.getMovieId())
                .orElseThrow(() -> new Exception("Không tìm thấy phim với ID: " + req.getMovieId()));
        Cinema cinema = cinemaRepository.findById(req.getCinemaId())
                .orElseThrow(() -> new Exception("Không tìm thấy rạp với ID: " + req.getCinemaId()));
        ScreenRoom room = screenRoomRepository.findById(req.getRoomId())
                .orElseThrow(() -> new Exception("Không tìm thấy phòng chiếu với ID: " + req.getRoomId()));

        int duration = movie.getDuration() != null ? movie.getDuration() : 120;
        int breakMinutes = req.getBreakMinutes() > 0 ? req.getBreakMinutes() : 15;
        LocalTime dailyStart = req.getDailyStartTime() != null ? req.getDailyStartTime() : LocalTime.of(9, 0);
        LocalTime dailyEnd = req.getDailyEndTime() != null ? req.getDailyEndTime() : LocalTime.of(23, 30);
        LocalDate start = req.getStartDate();
        LocalDate end = req.getEndDate() != null ? req.getEndDate() : start;

        if (end.isBefore(start)) {
            throw new Exception("Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu.");
        }

        List<Showtime> generated = new ArrayList<>();
        List<Showtime> existingRoomShowtimes = new ArrayList<>(showtimeRepository.findByRoomId(req.getRoomId()));

        LocalDate curDate = start;
        LocalDateTime minAllowedTime = LocalDateTime.now().plusHours(24);

        while (!curDate.isAfter(end)) {
            LocalDateTime slotStart = LocalDateTime.of(curDate, dailyStart);
            LocalDateTime dayLimit = LocalDateTime.of(curDate, dailyEnd);

            while (!slotStart.plusMinutes(duration).isAfter(dayLimit)) {
                LocalDateTime slotEnd = slotStart.plusMinutes(duration);

                if (slotStart.isBefore(minAllowedTime)) {
                    slotStart = slotStart.plusMinutes(30);
                    continue;
                }

                // Check conflict with existing showtimes
                boolean conflict = false;
                LocalDateTime nextAvailable = null;

                for (Showtime ex : existingRoomShowtimes) {
                    if (Boolean.TRUE.equals(ex.getIsDeleted()) || "DELETED".equalsIgnoreCase(ex.getStatus()) || "CANCELLED".equalsIgnoreCase(ex.getStatus()) || "DISABLED".equalsIgnoreCase(ex.getStatus())) {
                        continue;
                    }
                    LocalDateTime exStart = ex.getStartTime();
                    LocalDateTime exEnd = ex.getEndTime() != null ? ex.getEndTime() : exStart.plusMinutes(120);

                    LocalDateTime bufferStart = exStart.minusMinutes(breakMinutes);
                    LocalDateTime bufferEnd = exEnd.plusMinutes(breakMinutes);

                    if (slotStart.isBefore(bufferEnd) && slotEnd.isAfter(bufferStart)) {
                        conflict = true;
                        if (nextAvailable == null || bufferEnd.isAfter(nextAvailable)) {
                            nextAvailable = bufferEnd;
                        }
                    }
                }

                if (!conflict) {
                    Showtime st = new Showtime();
                    st.setMovieId(movie.getId());
                    st.setMovieTitle(movie.getTitle());
                    st.setMoviePoster(movie.getPosterUrl());
                    st.setCinemaId(cinema.getId());
                    st.setCinemaName(cinema.getName());
                    st.setRoomId(room.getId());
                    st.setRoomName(room.getName());
                    st.setStartTime(slotStart);
                    st.setEndTime(slotEnd);
                    st.setFormat(room.getScreenType() != null ? room.getScreenType() : "2D");
                    st.setBasePrice(req.getBasePrice() != null && req.getBasePrice() > 0 ? req.getBasePrice() : (movie.getStandardPrice() != null ? movie.getStandardPrice() : 90000.0));
                    st.setStatus("ACTIVE");

                    Showtime saved = showtimeRepository.save(st);
                    generated.add(saved);
                    existingRoomShowtimes.add(saved);

                    slotStart = slotEnd.plusMinutes(breakMinutes);
                } else {
                    if (nextAvailable != null && nextAvailable.isAfter(slotStart)) {
                        slotStart = nextAvailable;
                    } else {
                        slotStart = slotStart.plusMinutes(15);
                    }
                }
            }
            curDate = curDate.plusDays(1);
        }
        return generated;
    }

    private void validateShowtime(Showtime showtime, String currentId) throws Exception {
        Movie movie = movieRepository.findById(showtime.getMovieId())
                .orElseThrow(() -> new Exception("Không tìm thấy phim với ID: " + showtime.getMovieId()));
        
        if (showtime.getStartTime() == null) {
             throw new Exception("Thời gian bắt đầu không được để trống");
        }
        
        if (showtime.getStartTime().isBefore(LocalDateTime.now().plusHours(1))) {
             throw new Exception("Thời gian bắt đầu phải lớn hơn hiện tại ít nhất 1 giờ.");
        }
        
        if (showtime.getBasePrice() != null && showtime.getBasePrice() < 0) {
             throw new Exception("Giá vé cơ bản không được là số âm.");
        }
        if (showtime.getBasePrice() == null || showtime.getBasePrice() <= 0) {
            showtime.setBasePrice(movie.getStandardPrice() != null && movie.getStandardPrice() > 0 ? movie.getStandardPrice() : 90000.0);
        }
        
        int duration = movie.getDuration() != null ? movie.getDuration() : 120;
        
        // Setup EndTime based on duration
        showtime.setEndTime(showtime.getStartTime().plusMinutes(duration));
        
        // Cập nhật Format (Định Dạng) theo đúng Dạng màn hình của Phòng chiếu (ScreenRoom)
        ScreenRoom room = screenRoomRepository.findById(showtime.getRoomId()).orElse(null);
        if (room != null) {
            showtime.setFormat(room.getScreenType());
        }

        List<Showtime> roomShowtimes = showtimeRepository.findByRoomId(showtime.getRoomId());
        for (Showtime st : roomShowtimes) {
            if (currentId != null && st.getId().equals(currentId)) {
                continue;
            }
            
            if (Boolean.TRUE.equals(st.getIsDeleted()) || "DELETED".equalsIgnoreCase(st.getStatus()) || "CANCELLED".equalsIgnoreCase(st.getStatus()) || "DISABLED".equalsIgnoreCase(st.getStatus())) {
                continue;
            }
            
            LocalDateTime stEnd = st.getEndTime();
            if (stEnd == null) {
                stEnd = st.getStartTime().plusMinutes(120);
            }

            // Add 15 minutes break time
            LocalDateTime existingStart = st.getStartTime().minusMinutes(15);
            LocalDateTime existingEnd = stEnd.plusMinutes(15);
            
            if (showtime.getStartTime().isBefore(existingEnd) && showtime.getEndTime().isAfter(existingStart)) {
                throw new Exception("Thời gian chiếu bị trùng");
            }
        }
    }
}