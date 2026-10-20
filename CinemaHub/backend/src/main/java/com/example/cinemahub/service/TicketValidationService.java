package com.example.cinemahub.service;

import com.example.cinemahub.exception.TicketCheckInException;
import com.example.cinemahub.model.Showtime;
import com.example.cinemahub.model.Ticket;
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

import java.time.Clock;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class TicketValidationService {
    private final TicketRepository tickets;
    private final ShowtimeRepository showtimes;
    private final MongoTemplate mongo;

    @Value("${ticket.check-in.early-minutes:30}")
    private long earlyMinutes = 30;
    @Value("${ticket.check-in.gate:Main Gate 1}")
    private String gate = "Main Gate 1";
    private Clock clock = Clock.systemDefaultZone();

    public Ticket checkInTicket(String rawCode) {
        String code = rawCode == null ? "" : rawCode.trim();
        if (code.isEmpty() || code.length() > 512 || code.chars().anyMatch(Character::isISOControl)) {
            throw failure(HttpStatus.BAD_REQUEST, "INVALID_CODE", "Vui lòng nhập hoặc quét mã vé hợp lệ.");
        }

        // Match the entire stored QR, including its random token. Never turn an
        // incomplete/tampered QR into a valid booking-reference lookup.
        Ticket ticket;
        if (code.startsWith("CINEMAHUB|")) {
            ticket = tickets.findByQrCode(code).orElseThrow(this::notFound);
        } else if (code.matches("CH-[0-9]{6}-[A-Za-z0-9]{4}")) {
            ticket = tickets.findByBookingReference(code).orElseThrow(this::notFound);
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

    private void validateShowtime(Ticket ticket, LocalDateTime now) {
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
    }

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
