package com.example.cinemahub.controller;

import com.example.cinemahub.model.Payment;
import com.example.cinemahub.service.PaymentService;
import com.example.cinemahub.service.VnPayService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.Map;

@RestController
@RequestMapping("/api/payment")
@RequiredArgsConstructor
public class PaymentController {
    private final PaymentService payments;
    private final VnPayService gateway;

    @GetMapping("/configuration")
    public Map<String, Object> configuration() {
        return Map.of("configured", gateway.isConfigured(), "provider", "VNPAY");
    }

    @PostMapping("/create-vnpay-url")
    public ResponseEntity<?> create(@RequestBody Map<String, String> body, Authentication auth, HttpServletRequest request) {
        String bookingId = body.get("bookingId");
        if (bookingId == null || bookingId.isBlank()) return ResponseEntity.badRequest().body(Map.of("error", "Missing bookingId"));
        Payment payment = payments.initiate(bookingId, auth.getName(), request, body);
        return ResponseEntity.ok(Map.of("paymentUrl", payment.getCheckoutUrl(), "transactionId", payment.getTransactionId(),
                "totalAmount", payment.getAmount(), "expiresAt", payment.getExpiresAt()));
    }

    @GetMapping("/vnpay-callback")
    public ResponseEntity<?> callback(@RequestParam Map<String, String> params, Authentication auth) {
        payments.result(params.get("vnp_TxnRef"), auth.getName());
        String code = payments.confirm(params);
        if (!"00".equals(code) && !"02".equals(code))
            return ResponseEntity.badRequest().body(Map.of("status", "ERROR", "message", "Cannot verify payment", "code", code));
        return ResponseEntity.ok(payments.result(params.get("vnp_TxnRef"), auth.getName()));
    }

    @GetMapping("/transactions/{id}")
    public Map<String, Object> status(@PathVariable String id, Authentication auth) {
        return payments.result(id, auth.getName());
    }

    @GetMapping("/vnpay-ipn")
    public Map<String, String> ipn(@RequestParam Map<String, String> params) {
        try {
            String code = payments.confirm(params);
            String message = switch (code) {
                case "00" -> "Confirm Success";
                case "01" -> "Order not found";
                case "02" -> "Order already confirmed";
                case "04" -> "Invalid Amount";
                case "97" -> "Invalid Checksum";
                default -> "Unknown Error";
            };
            return Map.of("RspCode", code, "Message", message);
        } catch (RuntimeException ex) {
            return Map.of("RspCode", "99", "Message", "Temporary processing error");
        }
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<?> failure(ResponseStatusException ex) {
        return ResponseEntity.status(ex.getStatusCode()).body(Map.of("error", ex.getReason(), "message", ex.getReason()));
    }
}
