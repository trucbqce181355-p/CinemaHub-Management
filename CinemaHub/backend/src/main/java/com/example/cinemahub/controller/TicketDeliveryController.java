package com.example.cinemahub.controller;

import com.example.cinemahub.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.Map;

@RestController
@RequestMapping("/api/payment/bookings/{id}/ticket")
@RequiredArgsConstructor
public class TicketDeliveryController {
    private final PaymentService payments;
    private final TicketDeliveryService delivery;
    private final TicketQrService qr;
    private final AdmissionCoordinator admission;

    @GetMapping(value = "/qr", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> qr(@PathVariable String id, Authentication auth) {
        return admission.read(() -> {
            var ticket = delivery.paidTicket(payments.owned(id, auth.getName()));
            return ResponseEntity.ok().header(HttpHeaders.CACHE_CONTROL, "no-store")
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"CinemaHub-ticket-QR.png\"")
                    .body(qr.png(ticket.getQrCode()));
        });
    }

    @GetMapping("/email")
    public Map<String, Object> status(@PathVariable String id, Authentication auth) {
        return delivery.status(payments.owned(id, auth.getName()));
    }

    @PostMapping("/email")
    public Map<String, Object> email(@PathVariable String id, Authentication auth) {
        return admission.read(() -> delivery.retry(payments.owned(id, auth.getName())));
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<?> failure(ResponseStatusException ex) {
        return ResponseEntity.status(ex.getStatusCode()).body(Map.of("message", ex.getReason()));
    }
}
