package com.example.cinemahub.controller;

import com.example.cinemahub.model.Seat;
import com.example.cinemahub.service.SeatService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/seats")
@CrossOrigin("*")
public class SeatController {

    @Autowired
    private SeatService seatService;

    @GetMapping("/{roomId}")
    public ResponseEntity<List<Seat>> getSeatsByRoom(@PathVariable String roomId) {
        return ResponseEntity.ok(seatService.getSeatsByRoomId(roomId));
    }

    @PostMapping("/{roomId}/generate")
    public ResponseEntity<List<Seat>> generateSeats(
            @PathVariable String roomId,
            @RequestParam(defaultValue = "6") int rows,
            @RequestParam(defaultValue = "10") int cols) {
        return ResponseEntity.ok(seatService.generateDefaultSeats(roomId, rows, cols));
    }

    @PostMapping("/{roomId}/save")
    public ResponseEntity<List<Seat>> saveSeats(
            @PathVariable String roomId,
            @RequestBody List<Seat> seats) {
        return ResponseEntity.ok(seatService.saveSeats(roomId, seats));
    }
}
