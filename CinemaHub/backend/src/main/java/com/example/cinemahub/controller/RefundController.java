package com.example.cinemahub.controller;

import com.example.cinemahub.service.RefundService;
import com.example.cinemahub.model.*;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;

@RestController
@RequestMapping("/api/payment")
@RequiredArgsConstructor
public class RefundController {
    private final RefundService refunds;
    public record Request(String reason, boolean agreeToPolicy) {}
    public record Decision(String reason) {}

    private boolean staff(Authentication auth) {
        return auth.getAuthorities().stream().anyMatch(a -> Set.of("ROLE_Staff", "ROLE_Manager").contains(a.getAuthority()));
    }

    @GetMapping("/bookings/{id}/refund")
    public Map<String, Object> policy(@PathVariable String id, Authentication auth) {
        return refunds.policy(id, auth.getName(), staff(auth));
    }

    @PostMapping("/bookings/{id}/refund")
    public Refund request(@PathVariable String id, @RequestBody Request body, Authentication auth) {
        return refunds.request(id, auth.getName(), staff(auth), body.reason(), body.agreeToPolicy());
    }

    @GetMapping("/refunds")
    @PreAuthorize("hasRole('Manager')")
    public List<Booking> queue(@RequestParam(required = false) String status) { return refunds.queue(status); }

    @PostMapping("/bookings/{id}/refund/approve")
    @PreAuthorize("hasRole('Manager')")
    public Refund approve(@PathVariable String id, Authentication auth, HttpServletRequest request) {
        return refunds.approve(id, auth.getName(), request.getRemoteAddr());
    }

    @PostMapping("/bookings/{id}/refund/reject")
    @PreAuthorize("hasRole('Manager')")
    public Refund reject(@PathVariable String id, @RequestBody Decision body, Authentication auth) {
        return refunds.reject(id, auth.getName(), body.reason());
    }

    @PostMapping("/bookings/{id}/refund/reconcile")
    @PreAuthorize("hasRole('Manager')")
    public Refund reconcile(@PathVariable String id, Authentication auth, HttpServletRequest request) {
        return refunds.reconcile(id, auth.getName(), request.getRemoteAddr());
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<?> failure(ResponseStatusException ex) {
        return ResponseEntity.status(ex.getStatusCode()).body(Map.of("message", ex.getReason()));
    }
}
