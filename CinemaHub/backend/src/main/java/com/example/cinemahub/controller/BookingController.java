package com.example.cinemahub.controller;

import com.example.cinemahub.dto.*;
import com.example.cinemahub.model.Booking;
import com.example.cinemahub.service.BookingService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bookings")
@CrossOrigin(origins = "*")
public class BookingController {

    @Autowired
    private BookingService bookingService;

    // 1. Check seat availability for a showtime
    @GetMapping("/seats")
    public ResponseEntity<?> getSeatAvailability(@RequestParam String showtimeId) {
        try {
            return ResponseEntity.ok(bookingService.getSeatAvailability(showtimeId));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // 2. Temporarily hold seats (10-minute countdown)
    @PostMapping("/hold")
    public ResponseEntity<?> holdSeats(@Valid @RequestBody HoldSeatRequest req, Authentication authentication) {
        try {
            String userId = (authentication != null && authentication.isAuthenticated()) ? authentication.getName() : null;
            Booking booking = bookingService.holdSeats(req, userId);
            return ResponseEntity.ok(booking);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // 3. Check seat hold duration & remaining time
    @GetMapping("/{id}/hold-status")
    public ResponseEntity<?> checkHoldStatus(@PathVariable String id) {
        try {
            return ResponseEntity.ok(bookingService.checkHoldStatus(id));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // 4. Calculate total ticket price (with seat types, format surcharge, promo)
    @PostMapping("/calculate-price")
    public ResponseEntity<?> calculatePrice(@Valid @RequestBody CalculatePriceRequest req) {
        try {
            return ResponseEntity.ok(bookingService.calculatePrice(req));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // 5. Apply promo code
    @PostMapping("/apply-promo")
    public ResponseEntity<?> applyPromo(@Valid @RequestBody ApplyPromoRequest req) {
        try {
            return ResponseEntity.ok(bookingService.applyPromo(req));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // 6. Confirm booking
    @PostMapping("/{id}/confirm")
    public ResponseEntity<?> confirmBooking(@PathVariable String id, @RequestBody ConfirmBookingRequest req) {
        try {
            return ResponseEntity.ok(bookingService.confirmBooking(id, req));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // 7. Cancel booking
    @PostMapping("/{id}/cancel")
    public ResponseEntity<?> cancelBooking(@PathVariable String id, @RequestBody(required = false) Map<String, String> body) {
        try {
            String reason = body != null ? body.get("reason") : "Hủy theo yêu cầu";
            return ResponseEntity.ok(bookingService.cancelBooking(id, reason));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // 8. Staff create booking at counter
    @PostMapping("/counter-booking")
    public ResponseEntity<?> createCounterBooking(@Valid @RequestBody CounterBookingRequest req, Authentication authentication) {
        try {
            String staffId = (authentication != null) ? authentication.getName() : "Counter-Staff";
            return ResponseEntity.ok(bookingService.createCounterBooking(req, staffId));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // 9. View booking history
    @GetMapping("/my-history")
    public ResponseEntity<?> getBookingHistory(
            @RequestParam(required = false) String email,
            @RequestParam(required = false) String phone,
            Authentication authentication) {
        String userId = (authentication != null && authentication.isAuthenticated()) ? authentication.getName() : null;
        List<Booking> list = bookingService.getBookingHistory(userId, email, phone);
        return ResponseEntity.ok(list);
    }

    // 10. View booking details by ID
    @GetMapping("/{id}")
    public ResponseEntity<?> getBookingDetails(@PathVariable String id) {
        try {
            return ResponseEntity.ok(bookingService.getBookingDetails(id));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // 11. View booking details by booking reference
    @GetMapping("/reference/{reference}")
    public ResponseEntity<?> getBookingByReference(@PathVariable String reference) {
        try {
            return ResponseEntity.ok(bookingService.getBookingDetails(reference));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // 12. Check booking status (Quick public verification)
    @GetMapping("/status/{reference}")
    public ResponseEntity<?> getBookingStatus(@PathVariable String reference) {
        try {
            return ResponseEntity.ok(bookingService.getBookingStatus(reference));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
