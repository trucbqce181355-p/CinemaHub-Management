package com.example.cinemahub.controller;

import com.example.cinemahub.model.Ticket;
import com.example.cinemahub.service.TicketValidationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/tickets")
@CrossOrigin(origins = "*")
public class TicketController {
    
    @Autowired
    private TicketValidationService ticketValidationService;

    @PostMapping("/check-in/{id}")
    public ResponseEntity<?> checkIn(@PathVariable String id) {
        try {
            Ticket checkedInTicket = ticketValidationService.checkInTicket(id);
            return ResponseEntity.ok(Map.of("message", "Check-in thành công!", "ticket", checkedInTicket));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
