package com.example.cinemahub.controller;

import com.example.cinemahub.model.Movie;
import com.example.cinemahub.service.MovieService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/movies")
@CrossOrigin(origins = "*") // Allows React frontend to call this API
public class MovieController {

    @Autowired
    private MovieService movieService;

    @GetMapping
    public List<Movie> getAllMovies(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status) {
        return movieService.searchMovies(search, status);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Movie> getMovieById(@PathVariable String id) {
        return movieService.getMovieById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('manage_movies')")
    public Movie addMovie(@RequestBody Movie movie) {
        return movieService.addMovie(movie);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('manage_movies')")
    public ResponseEntity<Movie> updateMovie(@PathVariable String id, @RequestBody Movie movie) {
        try {
            return ResponseEntity.ok(movieService.updateMovie(id, movie));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('manage_movies')")
    public ResponseEntity<Void> deleteMovie(@PathVariable String id) {
        movieService.deleteMovie(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAuthority('manage_movies')")
    public ResponseEntity<Movie> updateStatus(@PathVariable String id, @RequestBody Map<String, String> body) {
        try {
            return ResponseEntity.ok(movieService.updateStatus(id, body.get("status")));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
