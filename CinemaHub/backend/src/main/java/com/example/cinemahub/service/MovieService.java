package com.example.cinemahub.service;

import com.example.cinemahub.model.Movie;
import com.example.cinemahub.repository.MovieRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class MovieService {

    @Autowired
    private MovieRepository movieRepository;

    public List<Movie> getAllMovies() {
        return movieRepository.findAll();
    }

    public List<Movie> searchMovies(String title, String status) {
        if (title != null && !title.isEmpty()) {
            return movieRepository.searchByTitle(title);
        } else if (status != null && !status.equals("All")) {
            return movieRepository.findByStatus(status);
        }
        return movieRepository.findAll();
    }

    public Optional<Movie> getMovieById(String id) {
        return movieRepository.findById(id);
    }

    public Movie addMovie(Movie movie) {
        return movieRepository.save(movie);
    }

    public Movie updateMovie(String id, Movie updatedMovie) {
        return movieRepository.findById(id).map(movie -> {
            movie.setTitle(updatedMovie.getTitle());
            movie.setDescription(updatedMovie.getDescription());
            movie.setDuration(updatedMovie.getDuration());
            movie.setAgeRating(updatedMovie.getAgeRating());
            movie.setStatus(updatedMovie.getStatus());
            movie.setTrailerUrl(updatedMovie.getTrailerUrl());
            movie.setPosterUrl(updatedMovie.getPosterUrl());
            movie.setGenres(updatedMovie.getGenres());
            movie.setDirectors(updatedMovie.getDirectors());
            movie.setActors(updatedMovie.getActors());
            movie.setReleaseDate(updatedMovie.getReleaseDate());
            return movieRepository.save(movie);
        }).orElseThrow(() -> new RuntimeException("Movie not found"));
    }

    public void deleteMovie(String id) {
        movieRepository.deleteById(id);
    }

    public Movie updateStatus(String id, String status) {
        return movieRepository.findById(id).map(movie -> {
            movie.setStatus(status);
            return movieRepository.save(movie);
        }).orElseThrow(() -> new RuntimeException("Movie not found"));
    }
}
