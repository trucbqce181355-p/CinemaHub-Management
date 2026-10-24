package com.example.cinemahub.controller;

import com.example.cinemahub.dto.TicketCheckInRequest;
import com.example.cinemahub.exception.TicketCheckInException;
import com.example.cinemahub.service.TicketValidationService;
import com.example.cinemahub.service.TicketUsage;
import com.example.cinemahub.model.Ticket;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/tickets")
@RequiredArgsConstructor
public class TicketController {
    private final TicketValidationService ticketValidationService;

    @PostMapping("/verify")
    public ResponseEntity<?> verify(@Valid @RequestBody TicketCheckInRequest request) {
        var checked = ticketValidationService.verifyForShowtime(request.code(), request.expectedShowtimeId());
        Ticket ticket = checked.ticket();
        boolean partial = TicketUsage.state(ticket) == TicketUsage.State.PARTIALLY_USED;
        return ResponseEntity.ok(Map.of("code", partial ? "TICKET_PARTIALLY_USED" : "TICKET_VALID",
                "valid", true, "canCheckIn", true, "usageStatus", TicketUsage.state(ticket).name(),
                "message", partial ? "Vé đã dùng một phần. Chỉ các ghế chưa sử dụng sẽ được check-in."
                        : "Vé hợp lệ. Chưa thực hiện check-in.", "ticket", ticket,
                "showtime", checked.showtime(), "expectedShowtimeId", request.expectedShowtimeId()));
    }

    @PostMapping("/check-in")
    public ResponseEntity<?> checkIn(@Valid @RequestBody TicketCheckInRequest request) {
        return result(request.code(), request.expectedShowtimeId());
    }

    // Legacy path is retained, but cannot bypass the required screening context.
    @PostMapping("/check-in/{code}")
    public ResponseEntity<?> checkInLegacy(@PathVariable String code,
            @RequestParam(required = false) String expectedShowtimeId) {
        if (expectedShowtimeId == null || expectedShowtimeId.isBlank()) {
            throw new TicketCheckInException(org.springframework.http.HttpStatus.BAD_REQUEST,
                    "SHOWTIME_REQUIRED", "Vui lòng chọn suất chiếu đang soát vé.", null);
        }
        return result(code, expectedShowtimeId);
    }

    private ResponseEntity<?> result(String code, String expectedShowtimeId) {
        var checked = ticketValidationService.checkInForShowtime(code, expectedShowtimeId);
        return ResponseEntity.ok(Map.of("code", "CHECKED_IN", "usageStatus", "USED", "canCheckIn", false,
                "message", "Check-in thành công!", "ticket", checked.ticket(),
                "showtime", checked.showtime(), "expectedShowtimeId", expectedShowtimeId));
    }

    @ExceptionHandler(TicketCheckInException.class)
    public ResponseEntity<?> checkInFailure(TicketCheckInException ex) {
        Map<String, Object> response = new HashMap<>();
        response.put("code", ex.getCode());
        response.put("valid", false);
        response.put("canCheckIn", false);
        response.put("error", ex.getMessage());
        if (ex.getTicket() != null) {
            response.put("ticket", ex.getTicket());
            response.put("usageStatus", TicketUsage.state(ex.getTicket()).name());
            response.put("showtime", ticketValidationService.currentShowtime(ex.getTicket()));
        }
        return ResponseEntity.status(ex.getStatus()).body(response);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<?> invalidCode(MethodArgumentNotValidException ex) {
        String code = "INVALID_CODE";
        String message = "Vui lòng nhập hoặc quét mã vé hợp lệ.";
        if (ex.getBindingResult().hasFieldErrors("expectedShowtimeId")) {
            Object value = ex.getBindingResult().getFieldValue("expectedShowtimeId");
            boolean missing = value == null || value.toString().isBlank();
            code = missing ? "SHOWTIME_REQUIRED" : "INVALID_SHOWTIME_CONTEXT";
            message = missing ? "Vui lòng chọn suất chiếu đang soát vé." : "Mã suất chiếu đang soát không hợp lệ.";
        }
        return ResponseEntity.badRequest().body(Map.of("code", code, "error", message, "valid", false, "canCheckIn", false));
    }
}
