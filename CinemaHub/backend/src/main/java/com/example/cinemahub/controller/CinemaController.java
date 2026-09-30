package com.example.cinemahub.controller;

import com.example.cinemahub.model.Cinema;
import com.example.cinemahub.service.CinemaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/cinemas")
@CrossOrigin(origins = "*")
public class CinemaController {
    @Autowired
    private CinemaService cinemaService;

    // UC-33: View Cinema List
    @GetMapping
    public ResponseEntity<List<Cinema>> getAll() {
        return ResponseEntity.ok(cinemaService.getAllCinemas());
    }

    // UC-34: View Cinema Information
    @GetMapping("/{id}")
    public ResponseEntity<Cinema> getById(@PathVariable String id) {
        return ResponseEntity.ok(cinemaService.getCinemaById(id));
    }

    // UC-32: Add New Cinema
    @PostMapping
    public ResponseEntity<Cinema> create(@RequestBody Cinema cinema) {
        return ResponseEntity.ok(cinemaService.createCinema(cinema));
    }

    // UC-35: Edit Cinema Information
    @PutMapping("/{id}")
    public ResponseEntity<Cinema> update(@PathVariable String id, @RequestBody Cinema cinema) {
        return ResponseEntity.ok(cinemaService.updateCinema(id, cinema));
    }

    // UC-36: Delete/Disable Cinema
    @DeleteMapping("/{id}")
    public ResponseEntity<Cinema> disable(@PathVariable String id) {
        return ResponseEntity.ok(cinemaService.disableCinema(id));
    }

    // Delete Permanently
    @DeleteMapping("/{id}/permanent")
    public ResponseEntity<?> deletePermanently(@PathVariable String id) {
        try {
            cinemaService.deleteCinemaPermanently(id);
            return ResponseEntity.ok().build();
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
