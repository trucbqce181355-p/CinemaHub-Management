package com.example.cinemahub.service;

import com.example.cinemahub.model.Movie;
import com.example.cinemahub.model.Showtime;
import com.example.cinemahub.repository.MovieRepository;
import com.example.cinemahub.repository.ShowtimeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class MovieService {

    @Autowired
    private MovieRepository movieRepository;

    @Autowired
    private ShowtimeRepository showtimeRepository;

    private void enrichMovieShowtimes(List<Movie> movies) {
        if (movies == null || movies.isEmpty()) return;
        try {
            List<Showtime> allShowtimes = showtimeRepository.findAll();
            Map<String, Long> countMap = allShowtimes.stream()
                .filter(st -> st.getMovieId() != null)
                .collect(Collectors.groupingBy(Showtime::getMovieId, Collectors.counting()));
            for (Movie m : movies) {
                if (m.getId() != null) {
                    long count = countMap.getOrDefault(m.getId(), 0L);
                    m.setShowtimeCount(count);
                    m.setHasShowtimes(count > 0);
                }
            }
        } catch (Exception e) {
            // graceful fallback
        }
    }

    public List<Movie> getAllMovies() {
        List<Movie> movies = movieRepository.findAll();
        enrichMovieShowtimes(movies);
        return movies;
    }

    public List<Movie> searchMovies(String title, String status) {
        List<Movie> movies;
        if (title != null && !title.isEmpty()) {
            movies = movieRepository.searchByTitle(title);
        } else if (status != null && !status.equals("All")) {
            movies = movieRepository.findByStatus(status);
        } else {
            movies = movieRepository.findAll();
        }
        enrichMovieShowtimes(movies);
        return movies;
    }

    public Optional<Movie> getMovieById(String id) {
        Optional<Movie> opt = movieRepository.findById(id);
        opt.ifPresent(m -> {
            try {
                long count = showtimeRepository.countByMovieId(m.getId());
                m.setShowtimeCount(count);
                m.setHasShowtimes(count > 0);
            } catch (Exception ignored) {}
        });
        return opt;
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
            movie.setStandardPrice(updatedMovie.getStandardPrice());
            movie.setVipPrice(updatedMovie.getVipPrice());
            movie.setCouplePrice(updatedMovie.getCouplePrice());
            return movieRepository.save(movie);
        }).orElseThrow(() -> new RuntimeException("Movie not found"));
    }

    public void deleteMovie(String id) {
        if (showtimeRepository.existsByMovieId(id)) {
            long count = showtimeRepository.countByMovieId(id);
            throw new RuntimeException("Không thể xóa phim này vì đã có " + count + " suất chiếu trong hệ thống! Vui lòng xóa các suất chiếu trước khi xóa phim.");
        }
        movieRepository.deleteById(id);
    }

    public Movie updateStatus(String id, String status) {
        return movieRepository.findById(id).map(movie -> {
            movie.setStatus(status);
            return movieRepository.save(movie);
        }).orElseThrow(() -> new RuntimeException("Movie not found"));
    }
}
