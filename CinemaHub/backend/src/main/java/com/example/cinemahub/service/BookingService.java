package com.example.cinemahub.service;

import com.example.cinemahub.dto.*;
import com.example.cinemahub.model.*;
import com.example.cinemahub.repository.BookingRepository;
import com.example.cinemahub.repository.ShowtimeRepository;
import com.example.cinemahub.repository.TicketRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class BookingService {

    public static final int HOLD_DURATION_MINUTES = 10;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private ShowtimeRepository showtimeRepository;

    @Autowired
    private TicketRepository ticketRepository;

    @Autowired
    private PromotionValidationService promotionValidationService;

    @Autowired
    private EmailService emailService;

    // 1. Get Seat Availability (Seat matrix with live status)
    public SeatAvailabilityDTO getSeatAvailability(String showtimeId) {
        Showtime showtime = showtimeRepository.findById(showtimeId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy suất chiếu với ID: " + showtimeId));

        LocalDateTime now = LocalDateTime.now();

        // Expire old pending bookings
        List<Booking> activeBookings = bookingRepository.findByShowtimeIdAndStatusIn(
                showtimeId, Arrays.asList("CONFIRMED", "PENDING"));

        Set<String> bookedSeats = new HashSet<>();
        Set<String> heldSeats = new HashSet<>();

        for (Booking b : activeBookings) {
            if ("CONFIRMED".equalsIgnoreCase(b.getStatus())) {
                if (b.getSeats() != null) {
                    for (Booking.BookedSeat s : b.getSeats()) {
                        bookedSeats.add(s.getSeatId());
                    }
                }
            } else if ("PENDING".equalsIgnoreCase(b.getStatus())) {
                if (b.getHoldExpiresAt() != null && b.getHoldExpiresAt().isBefore(now)) {
                    // Expire this hold
                    b.setStatus("EXPIRED");
                    b.setUpdatedAt(now);
                    bookingRepository.save(b);
                } else {
                    if (b.getSeats() != null) {
                        for (Booking.BookedSeat s : b.getSeats()) {
                            heldSeats.add(s.getSeatId());
                        }
                    }
                }
            }
        }

        // Generate Standard 6x10 seat layout: Rows A-F, Cols 1-10
        String[] rows = {"A", "B", "C", "D", "E", "F"};
        List<SeatAvailabilityDTO.SeatItem> seatItems = new ArrayList<>();

        for (String row : rows) {
            for (int col = 1; col <= 10; col++) {
                String seatId = row + col;
                String seatType = getSeatType(row);
                Double price = calculateSingleSeatPrice(showtime, seatType);

                String status = "AVAILABLE";
                if (bookedSeats.contains(seatId)) {
                    status = "BOOKED";
                } else if (heldSeats.contains(seatId)) {
                    status = "HELD";
                }

                seatItems.add(SeatAvailabilityDTO.SeatItem.builder()
                        .seatId(seatId)
                        .row(row)
                        .col(col)
                        .seatType(seatType)
                        .price(price)
                        .status(status)
                        .build());
            }
        }

        int bookedCount = (int) seatItems.stream().filter(s -> "BOOKED".equals(s.getStatus())).count();
        int heldCount = (int) seatItems.stream().filter(s -> "HELD".equals(s.getStatus())).count();
        int availableCount = seatItems.size() - bookedCount - heldCount;

        return SeatAvailabilityDTO.builder()
                .showtimeId(showtimeId)
                .roomId(showtime.getRoomId())
                .roomName(showtime.getRoomName())
                .totalSeats(seatItems.size())
                .availableCount(availableCount)
                .heldCount(heldCount)
                .bookedCount(bookedCount)
                .seats(seatItems)
                .build();
    }

    // 2. Temporarily Hold Seats
    public Booking holdSeats(HoldSeatRequest req, String userId) {
        Showtime showtime = showtimeRepository.findById(req.getShowtimeId())
                .orElseThrow(() -> new RuntimeException("Suất chiếu không tồn tại"));

        if (!"Active".equalsIgnoreCase(showtime.getStatus())) {
            throw new RuntimeException("Suất chiếu hiện không khả dụng để đặt vé");
        }

        LocalDateTime now = LocalDateTime.now();
        if (showtime.getStartTime() != null && showtime.getStartTime().isBefore(now)) {
            throw new RuntimeException("Suất chiếu đã bắt đầu hoặc đã kết thúc, không thể đặt vé");
        }

        // Check for seat conflicts
        List<Booking> activeBookings = bookingRepository.findByShowtimeIdAndStatusIn(
                req.getShowtimeId(), Arrays.asList("CONFIRMED", "PENDING"));

        for (Booking b : activeBookings) {
            if ("CONFIRMED".equalsIgnoreCase(b.getStatus())) {
                for (Booking.BookedSeat s : b.getSeats()) {
                    if (req.getSeatIds().contains(s.getSeatId())) {
                        throw new RuntimeException("Ghế " + s.getSeatId() + " đã được bán! Vui lòng chọn ghế khác.");
                    }
                }
            } else if ("PENDING".equalsIgnoreCase(b.getStatus())) {
                if (b.getHoldExpiresAt() != null && b.getHoldExpiresAt().isBefore(now)) {
                    b.setStatus("EXPIRED");
                    b.setUpdatedAt(now);
                    bookingRepository.save(b);
                } else {
                    for (Booking.BookedSeat s : b.getSeats()) {
                        if (req.getSeatIds().contains(s.getSeatId())) {
                            throw new RuntimeException("Ghế " + s.getSeatId() + " đang được người khác giữ chỗ. Vui lòng chọn ghế khác!");
                        }
                    }
                }
            }
        }

        // Build booked seats list
        List<Booking.BookedSeat> seatList = new ArrayList<>();
        double subtotal = 0.0;
        for (String seatId : req.getSeatIds()) {
            String row = seatId.substring(0, 1).toUpperCase();
            String seatType = getSeatType(row);
            Double price = calculateSingleSeatPrice(showtime, seatType);
            subtotal += price;

            seatList.add(Booking.BookedSeat.builder()
                    .seatId(seatId)
                    .seatNumber(seatId)
                    .seatType(seatType)
                    .price(price)
                    .build());
        }

        String reference = generateBookingReference();
        LocalDateTime expiresAt = now.plusMinutes(HOLD_DURATION_MINUTES);

        Booking booking = Booking.builder()
                .bookingReference(reference)
                .userId(userId)
                .customerName(req.getCustomerName() != null ? req.getCustomerName() : "Khách hàng")
                .customerEmail(req.getCustomerEmail())
                .customerPhone(req.getCustomerPhone())
                .showtimeId(showtime.getId())
                .movieId(showtime.getMovieId())
                .movieTitle(showtime.getMovieTitle())
                .moviePoster(showtime.getMoviePoster())
                .cinemaId(showtime.getCinemaId())
                .cinemaName(showtime.getCinemaName())
                .roomId(showtime.getRoomId())
                .roomName(showtime.getRoomName())
                .showtimeStart(showtime.getStartTime())
                .showtimeFormat(showtime.getFormat())
                .seats(seatList)
                .subtotal(subtotal)
                .discountAmount(0.0)
                .totalAmount(subtotal)
                .status("PENDING")
                .holdExpiresAt(expiresAt)
                .bookingType("ONLINE")
                .createdAt(now)
                .updatedAt(now)
                .build();

        return bookingRepository.save(booking);
    }

    // 3. Check Seat Hold Duration
    public Map<String, Object> checkHoldStatus(String bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn đặt chỗ"));

        LocalDateTime now = LocalDateTime.now();
        Map<String, Object> res = new HashMap<>();
        res.put("bookingId", booking.getId());
        res.put("bookingReference", booking.getBookingReference());
        res.put("status", booking.getStatus());
        res.put("holdExpiresAt", booking.getHoldExpiresAt());

        if (!"PENDING".equalsIgnoreCase(booking.getStatus())) {
            res.put("isExpired", false);
            res.put("remainingSeconds", 0);
            return res;
        }

        if (booking.getHoldExpiresAt() == null || booking.getHoldExpiresAt().isBefore(now)) {
            booking.setStatus("EXPIRED");
            booking.setUpdatedAt(now);
            bookingRepository.save(booking);

            res.put("isExpired", true);
            res.put("remainingSeconds", 0);
            res.put("status", "EXPIRED");
        } else {
            long remaining = Duration.between(now, booking.getHoldExpiresAt()).getSeconds();
            res.put("isExpired", false);
            res.put("remainingSeconds", Math.max(0, remaining));
        }

        return res;
    }

    // 4. Calculate Total Ticket Price
    public CalculatePriceRequest.PriceResult calculatePrice(CalculatePriceRequest req) {
        Showtime showtime = showtimeRepository.findById(req.getShowtimeId())
                .orElseThrow(() -> new RuntimeException("Suất chiếu không tồn tại"));

        List<CalculatePriceRequest.SeatPriceItem> seatItems = new ArrayList<>();
        double subtotal = 0.0;

        for (String seatId : req.getSeatIds()) {
            String row = seatId.substring(0, 1).toUpperCase();
            String seatType = getSeatType(row);
            Double price = calculateSingleSeatPrice(showtime, seatType);
            subtotal += price;

            seatItems.add(CalculatePriceRequest.SeatPriceItem.builder()
                    .seatId(seatId)
                    .seatNumber(seatId)
                    .seatType(seatType)
                    .price(price)
                    .build());
        }

        double discount = 0.0;
        String promoTitle = null;

        if (req.getPromoCode() != null && !req.getPromoCode().isBlank()) {
            try {
                Promotion promo = promotionValidationService.validateCode(req.getPromoCode());
                discount = computeDiscount(promo, subtotal);
                promoTitle = promo.getTitle();
            } catch (Exception e) {
                // Invalid promo code, discount remains 0
            }
        }

        double totalAmount = Math.max(0.0, subtotal - discount);

        return CalculatePriceRequest.PriceResult.builder()
                .subtotal(subtotal)
                .discountAmount(discount)
                .totalAmount(totalAmount)
                .promoCode(discount > 0 ? req.getPromoCode() : null)
                .promoTitle(promoTitle)
                .seats(seatItems)
                .build();
    }

    // 5. Apply Promo Code
    public ApplyPromoRequest.PromoResult applyPromo(ApplyPromoRequest req) {
        Promotion promo = promotionValidationService.validateCode(req.getCode());

        // Check minimum spend condition if present
        if (promo.getConditions() != null && promo.getConditions().containsKey("minSpend")) {
            Object minSpendObj = promo.getConditions().get("minSpend");
            double minSpend = Double.parseDouble(minSpendObj.toString());
            if (req.getSubtotal() < minSpend) {
                throw new RuntimeException(String.format("Mã chỉ áp dụng cho đơn hàng từ %,.0f đ", minSpend));
            }
        }

        double discountAmount = computeDiscount(promo, req.getSubtotal());
        double newTotal = Math.max(0.0, req.getSubtotal() - discountAmount);

        if (req.getBookingId() != null && !req.getBookingId().isBlank()) {
            bookingRepository.findById(req.getBookingId()).ifPresent(b -> {
                b.setPromoCode(promo.getCode());
                b.setDiscountAmount(discountAmount);
                b.setTotalAmount(newTotal);
                b.setUpdatedAt(LocalDateTime.now());
                bookingRepository.save(b);
            });
        }

        return ApplyPromoRequest.PromoResult.builder()
                .code(promo.getCode())
                .title(promo.getTitle())
                .discountType(promo.getDiscountType())
                .discountValue(promo.getDiscountValue())
                .discountAmount(discountAmount)
                .newTotal(newTotal)
                .build();
    }

    // 6. Confirm Booking
    public Map<String, Object> confirmBooking(String bookingId, ConfirmBookingRequest req) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn đặt chỗ"));

        if ("CONFIRMED".equalsIgnoreCase(booking.getStatus())) {
            Ticket ticket = ticketRepository.findByBookingId(booking.getId()).orElse(null);
            return Map.of("message", "Đơn đặt chỗ đã được xác nhận trước đó", "booking", booking, "ticket", ticket);
        }

        LocalDateTime now = LocalDateTime.now();
        if (booking.getHoldExpiresAt() != null && booking.getHoldExpiresAt().isBefore(now)) {
            booking.setStatus("EXPIRED");
            bookingRepository.save(booking);
            throw new RuntimeException("Thời gian giữ ghế đã hết hạn. Vui lòng đặt lại chỗ!");
        }

        if (!"PENDING".equalsIgnoreCase(booking.getStatus())) {
            throw new RuntimeException("Đơn đặt chỗ không ở trạng thái chờ thanh toán");
        }

        // Apply promo if provided during confirm
        if (req.getPromoCode() != null && !req.getPromoCode().isBlank()) {
            try {
                Promotion promo = promotionValidationService.validateCode(req.getPromoCode());
                double discount = computeDiscount(promo, booking.getSubtotal());
                booking.setPromoCode(promo.getCode());
                booking.setDiscountAmount(discount);
                booking.setTotalAmount(Math.max(0.0, booking.getSubtotal() - discount));
            } catch (Exception ignored) {
            }
        }

        if (req.getCustomerName() != null && !req.getCustomerName().isBlank()) {
            booking.setCustomerName(req.getCustomerName());
        }
        if (req.getCustomerEmail() != null && !req.getCustomerEmail().isBlank()) {
            booking.setCustomerEmail(req.getCustomerEmail());
        }
        if (req.getCustomerPhone() != null && !req.getCustomerPhone().isBlank()) {
            booking.setCustomerPhone(req.getCustomerPhone());
        }

        booking.setPaymentMethod(req.getPaymentMethod());
        booking.setStatus("CONFIRMED");
        booking.setUpdatedAt(now);

        // Create Ticket document
        Ticket ticket = new Ticket();
        ticket.setBookingReference(booking.getBookingReference());
        ticket.setBookingId(booking.getId());
        ticket.setShowtimeId(booking.getShowtimeId());
        ticket.setCinemaId(booking.getCinemaId());
        ticket.setRoomId(booking.getRoomId());
        ticket.setCustomerName(booking.getCustomerName());
        ticket.setMovieTitle(booking.getMovieTitle());
        ticket.setShowtimeStart(booking.getShowtimeStart());
        ticket.setStatus("Paid");
        ticket.setCreatedAt(now);

        List<Ticket.SeatStatus> seatStatuses = new ArrayList<>();
        for (Booking.BookedSeat bs : booking.getSeats()) {
            Ticket.SeatStatus ss = new Ticket.SeatStatus();
            ss.setSeatId(bs.getSeatId());
            ss.setSeatNumber(bs.getSeatNumber());
            ss.setUsageStatus("Unused");
            seatStatuses.add(ss);
        }
        ticket.setSeats(seatStatuses);
        ticket.setQrCode("CINEMAHUB|" + booking.getBookingReference() + "|" + UUID.randomUUID());

        Ticket savedTicket = ticketRepository.save(ticket);
        booking.setTicketId(savedTicket.getId());
        Booking savedBooking = bookingRepository.save(booking);

        // Async email notification
        sendConfirmationEmailSafely(savedBooking, savedTicket);

        Map<String, Object> result = new HashMap<>();
        result.put("message", "Đặt vé thành công!");
        result.put("booking", savedBooking);
        result.put("ticket", savedTicket);
        return result;
    }

    // 7. Cancel Booking
    public Booking cancelBooking(String bookingId, String reason) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn đặt chỗ"));

        if ("CANCELLED".equalsIgnoreCase(booking.getStatus())) {
            return booking;
        }

        LocalDateTime now = LocalDateTime.now();

        if ("CONFIRMED".equalsIgnoreCase(booking.getStatus())) {
            // Check showtime: must be at least 60 mins before showtime to cancel
            if (booking.getShowtimeStart() != null) {
                long minutesBefore = Duration.between(now, booking.getShowtimeStart()).toMinutes();
                if (minutesBefore < 60) {
                    throw new RuntimeException("Chỉ được hủy vé trước giờ chiếu ít nhất 60 phút!");
                }
            }

            // Cancel ticket
            if (booking.getTicketId() != null) {
                ticketRepository.findById(booking.getTicketId()).ifPresent(t -> {
                    t.setStatus("Cancelled");
                    ticketRepository.save(t);
                });
            }
        }

        booking.setStatus("CANCELLED");
        booking.setNotes((booking.getNotes() != null ? booking.getNotes() + " | " : "") + "Lý do hủy: " + (reason != null ? reason : "Khách yêu cầu"));
        booking.setUpdatedAt(now);
        return bookingRepository.save(booking);
    }

    // 8. Staff Create Booking At Counter
    public Map<String, Object> createCounterBooking(CounterBookingRequest req, String staffId) {
        Showtime showtime = showtimeRepository.findById(req.getShowtimeId())
                .orElseThrow(() -> new RuntimeException("Suất chiếu không tồn tại"));

        LocalDateTime now = LocalDateTime.now();

        // Check seat conflicts
        List<Booking> activeBookings = bookingRepository.findByShowtimeIdAndStatusIn(
                req.getShowtimeId(), Arrays.asList("CONFIRMED", "PENDING"));

        for (Booking b : activeBookings) {
            if ("CONFIRMED".equalsIgnoreCase(b.getStatus())) {
                for (Booking.BookedSeat s : b.getSeats()) {
                    if (req.getSeatIds().contains(s.getSeatId())) {
                        throw new RuntimeException("Ghế " + s.getSeatId() + " đã được bán!");
                    }
                }
            } else if ("PENDING".equalsIgnoreCase(b.getStatus())) {
                if (b.getHoldExpiresAt() != null && b.getHoldExpiresAt().isAfter(now)) {
                    for (Booking.BookedSeat s : b.getSeats()) {
                        if (req.getSeatIds().contains(s.getSeatId())) {
                            throw new RuntimeException("Ghế " + s.getSeatId() + " đang được giữ chỗ online.");
                        }
                    }
                }
            }
        }

        // Build seats and price
        List<Booking.BookedSeat> seatList = new ArrayList<>();
        double subtotal = 0.0;
        for (String seatId : req.getSeatIds()) {
            String row = seatId.substring(0, 1).toUpperCase();
            String seatType = getSeatType(row);
            Double price = calculateSingleSeatPrice(showtime, seatType);
            subtotal += price;

            seatList.add(Booking.BookedSeat.builder()
                    .seatId(seatId)
                    .seatNumber(seatId)
                    .seatType(seatType)
                    .price(price)
                    .build());
        }

        double discount = 0.0;
        if (req.getPromoCode() != null && !req.getPromoCode().isBlank()) {
            try {
                Promotion promo = promotionValidationService.validateCode(req.getPromoCode());
                discount = computeDiscount(promo, subtotal);
            } catch (Exception ignored) {
            }
        }

        double totalAmount = Math.max(0.0, subtotal - discount);
        String reference = generateBookingReference();

        Booking booking = Booking.builder()
                .bookingReference(reference)
                .customerName(req.getCustomerName())
                .customerPhone(req.getCustomerPhone())
                .customerEmail(req.getCustomerEmail())
                .showtimeId(showtime.getId())
                .movieId(showtime.getMovieId())
                .movieTitle(showtime.getMovieTitle())
                .moviePoster(showtime.getMoviePoster())
                .cinemaId(showtime.getCinemaId())
                .cinemaName(showtime.getCinemaName())
                .roomId(showtime.getRoomId())
                .roomName(showtime.getRoomName())
                .showtimeStart(showtime.getStartTime())
                .showtimeFormat(showtime.getFormat())
                .seats(seatList)
                .subtotal(subtotal)
                .promoCode(discount > 0 ? req.getPromoCode() : null)
                .discountAmount(discount)
                .totalAmount(totalAmount)
                .status("CONFIRMED")
                .paymentMethod(req.getPaymentMethod())
                .bookingType("COUNTER")
                .counterStaffId(staffId)
                .notes(req.getStaffNotes())
                .createdAt(now)
                .updatedAt(now)
                .build();

        // Create Ticket immediately
        Ticket ticket = new Ticket();
        ticket.setBookingReference(reference);
        ticket.setShowtimeId(showtime.getId());
        ticket.setCinemaId(showtime.getCinemaId());
        ticket.setRoomId(showtime.getRoomId());
        ticket.setCustomerName(req.getCustomerName());
        ticket.setMovieTitle(showtime.getMovieTitle());
        ticket.setShowtimeStart(showtime.getStartTime());
        ticket.setStatus("Paid");
        ticket.setCreatedAt(now);

        List<Ticket.SeatStatus> seatStatuses = new ArrayList<>();
        for (Booking.BookedSeat bs : seatList) {
            Ticket.SeatStatus ss = new Ticket.SeatStatus();
            ss.setSeatId(bs.getSeatId());
            ss.setSeatNumber(bs.getSeatNumber());
            ss.setUsageStatus("Unused");
            seatStatuses.add(ss);
        }
        ticket.setSeats(seatStatuses);
        ticket.setQrCode("CINEMAHUB|COUNTER|" + reference + "|" + UUID.randomUUID());

        Ticket savedTicket = ticketRepository.save(ticket);
        booking.setTicketId(savedTicket.getId());
        Booking savedBooking = bookingRepository.save(booking);

        Map<String, Object> result = new HashMap<>();
        result.put("message", "Tạo vé tại quầy thành công!");
        result.put("booking", savedBooking);
        result.put("ticket", savedTicket);
        return result;
    }

    // 9. View Booking History
    public List<Booking> getBookingHistory(String userId, String email, String phone) {
        if (userId != null && !userId.isBlank()) {
            return bookingRepository.findByUserIdOrderByCreatedAtDesc(userId);
        } else if (email != null && !email.isBlank()) {
            return bookingRepository.findByCustomerEmailOrderByCreatedAtDesc(email);
        } else if (phone != null && !phone.isBlank()) {
            return bookingRepository.findByCustomerPhoneOrderByCreatedAtDesc(phone);
        }
        return bookingRepository.findAllByOrderByCreatedAtDesc();
    }

    // 10. View Booking Details
    public Map<String, Object> getBookingDetails(String idOrRef) {
        Booking booking = bookingRepository.findById(idOrRef)
                .or(() -> bookingRepository.findByBookingReference(idOrRef))
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn đặt vé: " + idOrRef));

        Ticket ticket = null;
        if (booking.getTicketId() != null) {
            ticket = ticketRepository.findById(booking.getTicketId()).orElse(null);
        } else {
            ticket = ticketRepository.findByBookingReference(booking.getBookingReference()).orElse(null);
        }

        Map<String, Object> res = new HashMap<>();
        res.put("booking", booking);
        res.put("ticket", ticket);
        return res;
    }

    // 11. Check Booking Status
    public Map<String, Object> getBookingStatus(String bookingReference) {
        Booking booking = bookingRepository.findByBookingReference(bookingReference)
                .orElseThrow(() -> new RuntimeException("Mã đặt vé không tồn tại: " + bookingReference));

        Ticket ticket = ticketRepository.findByBookingReference(bookingReference).orElse(null);
        boolean isCheckedIn = false;
        if (ticket != null && ticket.getSeats() != null) {
            isCheckedIn = ticket.getSeats().stream().allMatch(s -> "Used".equalsIgnoreCase(s.getUsageStatus()));
        }

        Map<String, Object> res = new HashMap<>();
        res.put("bookingReference", booking.getBookingReference());
        res.put("status", booking.getStatus());
        res.put("movieTitle", booking.getMovieTitle());
        res.put("cinemaName", booking.getCinemaName());
        res.put("roomName", booking.getRoomName());
        res.put("showtimeStart", booking.getShowtimeStart());
        res.put("seats", booking.getSeats().stream().map(Booking.BookedSeat::getSeatNumber).collect(Collectors.toList()));
        res.put("totalAmount", booking.getTotalAmount());
        res.put("isCheckedIn", isCheckedIn);
        res.put("bookingType", booking.getBookingType());
        res.put("ticketId", booking.getTicketId());
        return res;
    }

    // --- Helper Methods ---

    private String getSeatType(String row) {
        if ("F".equalsIgnoreCase(row)) {
            return "COUPLE";
        } else if ("C".equalsIgnoreCase(row) || "D".equalsIgnoreCase(row) || "E".equalsIgnoreCase(row)) {
            return "VIP";
        }
        return "STANDARD";
    }

    private Double calculateSingleSeatPrice(Showtime showtime, String seatType) {
        double base = showtime.getBasePrice() != null ? showtime.getBasePrice() : 90000.0;
        
        // Format surcharge
        if ("3D".equalsIgnoreCase(showtime.getFormat())) {
            base += 20000.0;
        } else if ("IMAX".equalsIgnoreCase(showtime.getFormat())) {
            base += 40000.0;
        }

        // Seat type surcharge
        if ("VIP".equalsIgnoreCase(seatType)) {
            base += 30000.0;
        } else if ("COUPLE".equalsIgnoreCase(seatType)) {
            base = base * 2 + 20000.0;
        }

        return base;
    }

    private double computeDiscount(Promotion promo, double subtotal) {
        if ("PERCENTAGE".equalsIgnoreCase(promo.getDiscountType())) {
            double percent = promo.getDiscountValue() != null ? promo.getDiscountValue() : 0.0;
            return Math.min(subtotal, subtotal * (percent / 100.0));
        } else {
            // FIXED_AMOUNT
            double fixed = promo.getDiscountValue() != null ? promo.getDiscountValue() : 0.0;
            return Math.min(subtotal, fixed);
        }
    }

    private String generateBookingReference() {
        String dateStr = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyMMdd"));
        String randomStr = UUID.randomUUID().toString().substring(0, 4).toUpperCase();
        return "CH-" + dateStr + "-" + randomStr;
    }

    private void sendConfirmationEmailSafely(Booking booking, Ticket ticket) {
        if (booking.getCustomerEmail() == null || booking.getCustomerEmail().isBlank()) {
            return;
        }
        try {
            String seatNames = booking.getSeats().stream()
                    .map(Booking.BookedSeat::getSeatNumber)
                    .collect(Collectors.joining(", "));
            String text = String.format(
                    "Xin chào %s,\n\nBạn đã đặt vé thành công tại CinemaHub!\n\n" +
                    "Mã đặt chỗ: %s\n" +
                    "Phim: %s\n" +
                    "Rạp: %s (%s)\n" +
                    "Suất chiếu: %s\n" +
                    "Ghế: %s\n" +
                    "Tổng thanh toán: %,.0f đ\n\n" +
                    "Vui lòng đưa mã vé khi đến rạp để soát vé. Chúc bạn xem phim vui vẻ!",
                    booking.getCustomerName(),
                    booking.getBookingReference(),
                    booking.getMovieTitle(),
                    booking.getCinemaName(),
                    booking.getRoomName(),
                    booking.getShowtimeStart(),
                    seatNames,
                    booking.getTotalAmount()
            );
            emailService.sendEmail(booking.getCustomerEmail(), "[CinemaHub] Xác nhận đặt vé thành công - " + booking.getBookingReference(), text);
        } catch (Exception e) {
            System.err.println("Gửi email xác nhận không thành công: " + e.getMessage());
        }
    }
}
