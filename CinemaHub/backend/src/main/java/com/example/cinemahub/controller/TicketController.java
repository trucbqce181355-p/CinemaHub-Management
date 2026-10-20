package com.example.cinemahub.controller;

import com.example.cinemahub.dto.TicketCheckInRequest;
import com.example.cinemahub.exception.TicketCheckInException;
import com.example.cinemahub.service.TicketValidationService;
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
        return ResponseEntity.ok(Map.of("code", "TICKET_VALID", "valid", true,
                "message", "Vé hợp lệ. Chưa thực hiện check-in.",
                "ticket", ticketValidationService.verifyTicket(request.code())));
    }

    @PostMapping("/check-in")
    public ResponseEntity<?> checkIn(@Valid @RequestBody TicketCheckInRequest request) {
        return result(request.code());
    }

    // Retain existing clients that submit an ID or URL-encoded code in the path.
    @PostMapping("/check-in/{code}")
    public ResponseEntity<?> checkInLegacy(@PathVariable String code) {
        return result(code);
    }

    private ResponseEntity<?> result(String code) {
        return ResponseEntity.ok(Map.of("code", "CHECKED_IN", "message", "Check-in thành công!",
                "ticket", ticketValidationService.checkInTicket(code)));
    }

    @ExceptionHandler(TicketCheckInException.class)
    public ResponseEntity<?> checkInFailure(TicketCheckInException ex) {
        Map<String, Object> response = new HashMap<>();
        response.put("code", ex.getCode());
        response.put("valid", false);
        response.put("error", ex.getMessage());
        if (ex.getTicket() != null) response.put("ticket", ex.getTicket());
        return ResponseEntity.status(ex.getStatus()).body(response);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<?> invalidCode() {
        return ResponseEntity.badRequest().body(Map.of("code", "INVALID_CODE", "error", "Vui lòng nhập hoặc quét mã vé hợp lệ."));
    }
}
