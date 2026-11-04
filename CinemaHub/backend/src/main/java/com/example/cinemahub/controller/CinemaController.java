package com.example.cinemahub.controller;

import com.example.cinemahub.model.Cinema;
import com.example.cinemahub.model.Showtime;
import com.example.cinemahub.service.CinemaService;
import org.springframework.core.io.Resource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.time.LocalDate;
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

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Cinema> createWithImage(@RequestPart("cinema") Cinema cinema,
                                                   @RequestPart("image") MultipartFile image) {
        return ResponseEntity.ok(cinemaService.createCinema(cinema, image));
    }

    // UC-35: Edit Cinema Information
    @PutMapping("/{id}")
    public ResponseEntity<Cinema> update(@PathVariable String id, @RequestBody Cinema cinema) {
        return ResponseEntity.ok(cinemaService.updateCinema(id, cinema));
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Cinema> updateWithImage(@PathVariable String id, @RequestPart("cinema") Cinema cinema,
                                                   @RequestPart("image") MultipartFile image) {
        return ResponseEntity.ok(cinemaService.updateCinema(id, cinema, image));
    }

    @GetMapping("/{id}/showtimes")
    public ResponseEntity<List<Showtime>> getShowtimes(@PathVariable String id,
            @RequestParam LocalDate from, @RequestParam LocalDate to) {
        return ResponseEntity.ok(cinemaService.getShowtimes(id, from, to));
    }

    @GetMapping("/images/{id}")
    public ResponseEntity<Resource> getImage(@PathVariable String id) {
        var resource = cinemaService.getImage(id);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(resource.getContentType()))
                .header(HttpHeaders.CACHE_CONTROL, "public, max-age=86400")
                .body(resource);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> badRequest(IllegalArgumentException error) {
        return ResponseEntity.badRequest().body(Map.of("error", error.getMessage()));
    }

    // UC-36: Delete/Disable Cinema
    @DeleteMapping("/{id}")
    public ResponseEntity<Cinema> disable(@PathVariable String id) {
        return ResponseEntity.ok(cinemaService.disableCinema(id));
    }

    // The legacy URL is retained as an alias; both routes only archive the record.
    @DeleteMapping({"/{id}/soft-delete", "/{id}/permanent"})
    public ResponseEntity<Cinema> softDelete(@PathVariable String id) {
        return ResponseEntity.ok(cinemaService.softDeleteCinema(id));
    }
}
