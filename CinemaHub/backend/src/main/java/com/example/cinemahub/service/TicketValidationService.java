package com.example.cinemahub.service;

import com.example.cinemahub.exception.TicketCheckInException;
import com.example.cinemahub.model.*;
import com.example.cinemahub.repository.ShowtimeRepository;
import com.example.cinemahub.repository.TicketRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.*;
import java.time.Clock;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class TicketValidationService {
    private final TicketRepository tickets;
    private final ShowtimeRepository showtimes;
    private final MongoTemplate mongo;
    private final AdmissionCoordinator admission;

    @Value("${ticket.check-in.early-minutes:30}")
    private long earlyMinutes = 30;
    @Value("${ticket.check-in.gate:Main Gate 1}")
    private String gate = "Main Gate 1";
    private Clock clock = Clock.systemDefaultZone();

    public Ticket verifyTicket(String rawCode) {
        return admission.read(() -> validateTicket(rawCode));
    }

    public Ticket checkInTicket(String rawCode) {
        return admission.write(() -> checkInValidated(rawCode));
    }

    private Ticket validateTicket(String rawCode) {
        String code = rawCode == null ? "" : rawCode.trim();
        if (code.isEmpty() || code.length() > 512 || code.chars().anyMatch(Character::isISOControl)) {
            throw failure(HttpStatus.BAD_REQUEST, "INVALID_CODE", "Vui lòng nhập hoặc quét mã vé hợp lệ.");
        }

        // Match the entire stored QR, including its random token. Never turn an
        // incomplete/tampered QR into a valid booking-reference lookup.
        Ticket ticket;
        if (code.startsWith("CINEMAHUB|")) {
            ticket = uniqueTicket("qrCode", code);
        } else if (code.matches("CH-[0-9]{6}-[A-Za-z0-9]{4,32}")) {
            ticket = uniqueTicket("bookingReference", code);
        } else if (code.matches("[A-Za-z0-9_-]{1,128}")) {
            ticket = tickets.findById(code).orElseThrow(this::notFound);
        } else {
            throw failure(HttpStatus.BAD_REQUEST, "INVALID_CODE", "Mã vé không đúng định dạng.");
        }

        if ("Used".equals(ticket.getStatus())) throw alreadyUsed(ticket);
        if (!"Paid".equals(ticket.getStatus())) {
            throw failure(HttpStatus.CONFLICT, "TICKET_NOT_PAID", "Vé chưa được thanh toán hoặc đã bị hủy.");
        }
        if (ticket.getSeats() == null || ticket.getSeats().isEmpty()
                || ticket.getSeats().stream().anyMatch(seat -> seat == null
                    || seat.getSeatId() == null || seat.getSeatId().isBlank()
                    || (!"Unused".equals(seat.getUsageStatus()) && !"Used".equals(seat.getUsageStatus())))) {
            throw failure(HttpStatus.CONFLICT, "INVALID_TICKET", "Vé không có danh sách ghế hợp lệ. Vui lòng kiểm tra lại.");
        }
        if (ticket.getSeats().stream().allMatch(seat -> "Used".equals(seat.getUsageStatus()))) {
            throw alreadyUsed(ticket); // Also handles older tickets that kept status=Paid.
        }

        LocalDateTime now = LocalDateTime.now(clock);
        Showtime showtime = validateShowtime(ticket, now);
        validateBookingAndSeats(ticket, showtime);
        return ticket;
    }

    private Ticket checkInValidated(String rawCode) {
        Ticket ticket = validateTicket(rawCode);
        LocalDateTime now = LocalDateTime.now(clock);
        // Dependency checks can take time; enforce the closing boundary again at claim time.
        validateShowtime(ticket, now);
        Ticket.ScanMetadata scan = new Ticket.ScanMetadata();
        scan.setScannedAt(now.toString());
        scan.setScannedByGate(gate);

        // One conditional MongoDB write claims the whole ticket. Two gates can
        // read the same ticket, but only one can change Paid + Unused to Used.
        Query query = Query.query(Criteria.where("_id").is(ticket.getId())
                .and("status").is("Paid").and("showtimeId").is(ticket.getShowtimeId())
                .and("seats").elemMatch(Criteria.where("usageStatus").is("Unused")));
        Update update = new Update().set("status", "Used")
                .set("seats.$[unused].usageStatus", "Used")
                .set("seats.$[unused].scanMetadata", scan)
                .filterArray(Criteria.where("unused.usageStatus").is("Unused"));
        Ticket checkedIn = mongo.findAndModify(query, update,
                FindAndModifyOptions.options().returnNew(true), Ticket.class);
        if (checkedIn != null) return checkedIn;

        Ticket latest = tickets.findById(ticket.getId()).orElseThrow(this::notFound);
        if ("Used".equals(latest.getStatus()) || (latest.getSeats() != null && !latest.getSeats().isEmpty()
                && latest.getSeats().stream().allMatch(seat -> seat != null && "Used".equals(seat.getUsageStatus())))) {
            throw alreadyUsed(latest);
        }
        throw failure(HttpStatus.CONFLICT, "TICKET_CHANGED", "Trạng thái vé vừa thay đổi. Vui lòng kiểm tra lại.");
    }

    private Showtime validateShowtime(Ticket ticket, LocalDateTime now) {
        if (ticket.getShowtimeId() == null || ticket.getShowtimeId().isBlank()) {
            throw failure(HttpStatus.CONFLICT, "INVALID_SHOWTIME", "Vé không có suất chiếu hợp lệ.");
        }
        Showtime showtime = showtimes.findById(ticket.getShowtimeId()).orElseThrow(() ->
                failure(HttpStatus.CONFLICT, "INVALID_SHOWTIME", "Không tìm thấy suất chiếu của vé."));
        if (!"Active".equalsIgnoreCase(showtime.getStatus())) {
            throw failure(HttpStatus.CONFLICT, "SHOWTIME_UNAVAILABLE", "Suất chiếu đã bị hủy hoặc ngừng hoạt động.");
        }
        LocalDateTime start = showtime.getStartTime();
        LocalDateTime end = showtime.getEndTime();
        if (start == null || end == null || !end.isAfter(start) || earlyMinutes < 0) {
            throw failure(HttpStatus.CONFLICT, "INVALID_SHOWTIME", "Thời gian kiểm soát vé chưa được cấu hình hợp lệ.");
        }
        if (now.isBefore(start.minusMinutes(earlyMinutes))) {
            throw failure(HttpStatus.CONFLICT, "CHECK_IN_NOT_OPEN",
                    "Chưa đến giờ check-in. Vé được soát từ " + earlyMinutes + " phút trước giờ chiếu.");
        }
        if (!now.isBefore(end)) {
            throw failure(HttpStatus.CONFLICT, "CHECK_IN_CLOSED", "Đã hết thời gian check-in của suất chiếu này.");
        }
        return showtime;
    }

    private Ticket uniqueTicket(String field, String value) {
        List<Ticket> matches = mongo.find(Query.query(Criteria.where(field).is(value)).limit(2), Ticket.class);
        if (matches.size() > 1) throw failure(HttpStatus.CONFLICT, "AMBIGUOUS_CODE",
                "Mã vé bị trùng. Vui lòng dùng QR đầy đủ hoặc ID vé và kiểm tra lại dữ liệu.");
        if (matches.isEmpty()) throw notFound();
        return matches.get(0);
    }

    private void validateBookingAndSeats(Ticket ticket, Showtime showtime) {
        Booking booking;
        if (present(ticket.getBookingId())) {
            booking = mongo.findById(ticket.getBookingId(), Booking.class);
        } else {
            // Old counter tickets did not store bookingId. Resolve the explicit reverse link.
            List<Booking> linked = mongo.find(Query.query(Criteria.where("ticketId").is(ticket.getId())).limit(2), Booking.class);
            booking = linked.size() == 1 ? linked.get(0) : null;
        }
        if (booking == null || !"CONFIRMED".equals(booking.getStatus())) {
            throw failure(HttpStatus.CONFLICT, "BOOKING_UNAVAILABLE", "Đơn đặt vé không tồn tại, chưa xác nhận hoặc đã bị hủy.");
        }
        if (!same(ticket.getId(), booking.getTicketId())
                || !same(ticket.getBookingReference(), booking.getBookingReference())
                || !same(ticket.getShowtimeId(), booking.getShowtimeId())
                || !same(ticket.getRoomId(), showtime.getRoomId()) || !same(booking.getRoomId(), showtime.getRoomId())
                || !same(ticket.getCinemaId(), showtime.getCinemaId()) || !same(booking.getCinemaId(), showtime.getCinemaId())
                || !same(booking.getMovieId(), showtime.getMovieId())) {
            throw failure(HttpStatus.CONFLICT, "INVALID_TICKET", "Thông tin vé, đơn đặt chỗ và suất chiếu không khớp.");
        }
        if ("ONLINE".equals(booking.getBookingType())) {
            Payment payment = booking.getPayment();
            Double total = booking.getTotalAmount();
            if (payment == null || !"SUCCESS".equals(payment.getStatus()) || payment.isReconciliationRequired()
                    || !present(payment.getTransactionId()) || !"VND".equals(payment.getCurrency())
                    || total == null || !Double.isFinite(total) || total < 0 || payment.getAmount() == null
                    || payment.getAmount().compareTo(BigDecimal.valueOf(total)) != 0) {
                throw failure(HttpStatus.CONFLICT, "PAYMENT_NOT_CONFIRMED", "Thanh toán của đơn đặt vé chưa hợp lệ hoặc cần đối soát.");
            }
        } else if (!"COUNTER".equals(booking.getBookingType())
                || !Set.of("CASH", "CARD", "TRANSFER").contains(Objects.toString(booking.getPaymentMethod(), ""))) {
            throw failure(HttpStatus.CONFLICT, "PAYMENT_NOT_CONFIRMED", "Đơn đặt vé chưa có phương thức thanh toán hợp lệ.");
        }
        ScreenRoom room = present(showtime.getRoomId()) ? mongo.findById(showtime.getRoomId(), ScreenRoom.class) : null;
        Cinema cinema = present(showtime.getCinemaId()) ? mongo.findById(showtime.getCinemaId(), Cinema.class) : null;
        if (room == null || cinema == null || !"Active".equalsIgnoreCase(room.getStatus())
                || !"Active".equalsIgnoreCase(cinema.getStatus()) || !same(room.getCinemaId(), cinema.getId())) {
            throw failure(HttpStatus.CONFLICT, "VENUE_UNAVAILABLE", "Rạp hoặc phòng chiếu không còn hoạt động.");
        }
        Map<String, Seat> actual = new HashMap<>();
        for (Seat seat : mongo.find(Query.query(Criteria.where("roomId").is(room.getId())), Seat.class)) {
            if (actual.put(seat.getSeatNumber(), seat) != null) {
                throw failure(HttpStatus.CONFLICT, "INVALID_SEATS", "Sơ đồ ghế có dữ liệu trùng. Vui lòng kiểm tra lại.");
            }
        }
        Map<String, String> booked = new HashMap<>();
        if (booking.getSeats() == null || booking.getSeats().isEmpty()) throw invalidSeats();
        for (Booking.BookedSeat seat : booking.getSeats()) {
            if (seat == null || !same(seat.getSeatId(), seat.getSeatNumber())
                    || booked.put(seat.getSeatId(), seat.getSeatNumber()) != null) throw invalidSeats();
        }
        Set<String> seen = new HashSet<>();
        for (Ticket.SeatStatus seat : ticket.getSeats()) {
            Seat real = actual.get(seat.getSeatId());
            if (!seen.add(seat.getSeatId()) || real == null || !"ACTIVE".equalsIgnoreCase(real.getStatus())
                    || !same(seat.getSeatNumber(), real.getSeatNumber())
                    || !same(seat.getSeatNumber(), booked.get(seat.getSeatId()))) throw invalidSeats();
        }
        if (!seen.equals(booked.keySet())) throw invalidSeats();
    }

    private TicketCheckInException invalidSeats() {
        return failure(HttpStatus.CONFLICT, "INVALID_SEATS", "Ghế của vé không tồn tại, bị khóa, bị trùng hoặc không khớp đơn đặt chỗ.");
    }

    private boolean present(String value) { return value != null && !value.isBlank(); }
    private boolean same(String first, String second) { return present(first) && first.equals(second); }

    private TicketCheckInException notFound() {
        return failure(HttpStatus.NOT_FOUND, "TICKET_NOT_FOUND", "Không tìm thấy vé hợp lệ cho mã đã quét.");
    }

    private TicketCheckInException alreadyUsed(Ticket ticket) {
        return new TicketCheckInException(HttpStatus.CONFLICT, "ALREADY_CHECKED_IN",
                "Vé này đã được Check-in (sử dụng) trước đó rồi!", ticket);
    }

    private TicketCheckInException failure(HttpStatus status, String code, String message) {
        return new TicketCheckInException(status, code, message, null);
    }
}
