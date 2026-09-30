package com.example.cinemahub.controller;

import com.example.cinemahub.model.Showtime;
import com.example.cinemahub.service.ShowtimeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/showtimes")
@CrossOrigin(origins = "*")
public class ShowtimeController {

    @Autowired
    private ShowtimeService showtimeService;

    @GetMapping
    public List<Showtime> searchShowtimes(
            @RequestParam(required = false) String movieId,
            @RequestParam(required = false) String roomId) {
        return showtimeService.searchShowtimes(movieId, roomId);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Showtime> getShowtime(@PathVariable String id) {
        Showtime st = showtimeService.getShowtimeById(id);
        return st != null ? ResponseEntity.ok(st) : ResponseEntity.notFound().build();
    }

    @PostMapping
    public ResponseEntity<?> createShowtime(@RequestBody Showtime showtime) {
        try {
            Showtime created = showtimeService.createShowtime(showtime);
            return ResponseEntity.ok(created);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateShowtime(@PathVariable String id, @RequestBody Showtime showtime) {
        try {
            Showtime updated = showtimeService.updateShowtime(id, showtime);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable String id, @RequestBody Map<String, String> body) {
        try {
            String status = body.get("status");
            Showtime updated = showtimeService.updateStatus(id, status);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteShowtime(@PathVariable String id) {
        showtimeService.deleteShowtime(id);
        return ResponseEntity.ok(Map.of("message", "Deleted successfully"));
    }
}
