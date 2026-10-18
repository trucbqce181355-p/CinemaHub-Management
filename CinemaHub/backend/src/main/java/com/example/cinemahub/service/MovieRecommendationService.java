package com.example.cinemahub.service;

import com.example.cinemahub.dto.MovieRecommendationResponse;
import com.example.cinemahub.model.Booking;
import com.example.cinemahub.model.Movie;
import com.example.cinemahub.repository.BookingRepository;
import com.example.cinemahub.repository.MovieRepository;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Free, local content-based recommender. It uses only public movie metadata
 * and the authenticated customer's confirmed booking history.
 */
@Service
public class MovieRecommendationService {
    private static final int MAX_HISTORY = 30;
    private static final int MAX_LIMIT = 12;
    private static final Pattern NON_WORD = Pattern.compile("[^\\p{L}\\p{N}]+");
    private static final Set<String> STOP_WORDS = Set.of(
            "va", "la", "cua", "cho", "trong", "voi", "mot", "nhung", "cac", "nhu", "den", "tu",
            "the", "this", "that", "with", "from", "into", "about", "their", "they", "them", "have",
            "will", "when", "where", "what", "while", "after", "before", "over", "under", "movie", "film");

    private final MovieRepository movieRepository;
    private final BookingRepository bookingRepository;

    public MovieRecommendationService(MovieRepository movieRepository, BookingRepository bookingRepository) {
        this.movieRepository = movieRepository;
        this.bookingRepository = bookingRepository;
    }

    public List<MovieRecommendationResponse> recommendForCustomer(String userId, int requestedLimit) {
        if (userId == null || userId.isBlank()) {
            return List.of();
        }

        int limit = Math.max(1, Math.min(requestedLimit, MAX_LIMIT));
        List<Movie> eligibleMovies = movieRepository.findAll().stream()
                .filter(this::isCustomerVisible)
                .toList();
        if (eligibleMovies.isEmpty()) {
            return List.of();
        }

        Map<String, Movie> catalog = eligibleMovies.stream()
                .filter(movie -> movie.getId() != null)
                .collect(Collectors.toMap(Movie::getId, movie -> movie, (first, ignored) -> first));
        List<Booking> completedBookings = bookingRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .filter(this::isCompletedCustomerBooking)
                .toList();
        List<Booking> history = completedBookings.stream()
                .filter(booking -> booking.getMovieId() != null && catalog.containsKey(booking.getMovieId()))
                .limit(MAX_HISTORY)
                .toList();

        Set<String> watchedMovieIds = completedBookings.stream()
                .map(Booking::getMovieId)
                .filter(id -> id != null && !id.isBlank())
                .collect(Collectors.toSet());
        List<Movie> candidates = eligibleMovies.stream()
                .filter(movie -> movie.getId() != null && !watchedMovieIds.contains(movie.getId()))
                .toList();
        if (candidates.isEmpty()) {
            return List.of();
        }

        if (history.isEmpty()) {
            return fallbackSuggestions(candidates, limit);
        }

        Map<String, Double> inverseDocumentFrequency = buildInverseDocumentFrequency(eligibleMovies);
        Map<String, Double> customerProfile = buildCustomerProfile(history, catalog, inverseDocumentFrequency);
        if (customerProfile.isEmpty()) {
            return fallbackSuggestions(candidates, limit);
        }

        List<MovieRecommendationResponse> recommendations = candidates.stream()
                .map(movie -> {
                    Map<String, Double> features = featuresOf(movie, inverseDocumentFrequency);
                    double similarity = cosineSimilarity(customerProfile, features);
                    return new ScoredMovie(movie, similarity, explainMatch(movie, customerProfile));
                })
                .filter(scored -> scored.score() > 0)
                .sorted(Comparator.comparingDouble(ScoredMovie::score).reversed()
                        .thenComparing(scored -> safe(scored.movie().getTitle())))
                .limit(limit)
                .map(scored -> new MovieRecommendationResponse(
                        scored.movie(),
                        (int) Math.round(scored.score() * 100),
                        scored.reasons(),
                        true))
                .toList();

        return recommendations.isEmpty() ? fallbackSuggestions(candidates, limit) : recommendations;
    }

    private boolean isCustomerVisible(Movie movie) {
        return movie.getStatus() != null
                && ("ACTIVE".equalsIgnoreCase(movie.getStatus())
                || "COMING_SOON".equalsIgnoreCase(movie.getStatus()));
    }

    private boolean isCompletedCustomerBooking(Booking booking) {
        return "CONFIRMED".equalsIgnoreCase(booking.getStatus())
                && booking.getTicketId() != null
                && !booking.getTicketId().isBlank();
    }

    private List<MovieRecommendationResponse> fallbackSuggestions(List<Movie> candidates, int limit) {
        return candidates.stream()
                .sorted(Comparator.comparing((Movie movie) -> safe(movie.getReleaseDate())).reversed()
                        .thenComparing(movie -> safe(movie.getTitle())))
                .limit(limit)
                .map(movie -> new MovieRecommendationResponse(
                        movie, 0, List.of("Gợi ý phim mới trong danh sách CinemaHub"), false))
                .toList();
    }

    private Map<String, Double> buildCustomerProfile(
            List<Booking> history,
            Map<String, Movie> catalog,
            Map<String, Double> inverseDocumentFrequency) {
        Map<String, Double> profile = new HashMap<>();
        for (int index = 0; index < history.size(); index++) {
            Movie watched = catalog.get(history.get(index).getMovieId());
            if (watched == null) {
                continue;
            }
            // More recent completed bookings have a little more influence.
            double recencyWeight = 1.0 / (1.0 + index * 0.15);
            featuresOf(watched, inverseDocumentFrequency).forEach((feature, weight) ->
                    profile.merge(feature, weight * recencyWeight, Double::sum));
        }
        return profile;
    }

    private Map<String, Double> buildInverseDocumentFrequency(List<Movie> movies) {
        Map<String, Integer> documentFrequency = new HashMap<>();
        int documentCount = 0;
        for (Movie movie : movies) {
            Set<String> tokens = descriptionTokens(movie.getDescription()).keySet();
            if (tokens.isEmpty()) {
                continue;
            }
            documentCount++;
            tokens.forEach(token -> documentFrequency.merge(token, 1, Integer::sum));
        }

        Map<String, Double> idf = new HashMap<>();
        final int totalDocuments = Math.max(1, documentCount);
        documentFrequency.forEach((token, frequency) -> idf.put(token,
                Math.log((totalDocuments + 1.0) / (frequency + 1.0)) + 1.0));
        return idf;
    }

    private Map<String, Double> featuresOf(Movie movie, Map<String, Double> idf) {
        Map<String, Double> features = new HashMap<>();
        addCategoricalFeatures(features, "genre:", movie.getGenres(), 3.0);
        addCategoricalFeatures(features, "director:", movie.getDirectors(), 2.0);
        addCategoricalFeatures(features, "actor:", movie.getActors(), 1.0);
        descriptionTokens(movie.getDescription()).forEach((token, count) -> {
            double tf = 1.0 + Math.log(count);
            features.put("word:" + token, 0.5 * tf * idf.getOrDefault(token, 1.0));
        });
        return features;
    }

    private void addCategoricalFeatures(Map<String, Double> features, String prefix, List<String> values, double weight) {
        if (values == null) {
            return;
        }
        values.stream()
                .map(this::normalize)
                .filter(value -> !value.isBlank())
                .forEach(value -> features.put(prefix + value, weight));
    }

    private Map<String, Integer> descriptionTokens(String description) {
        if (description == null || description.isBlank()) {
            return Map.of();
        }
        Map<String, Integer> tokens = new HashMap<>();
        String normalized = normalize(description);
        for (String token : NON_WORD.split(normalized)) {
            if (token.length() >= 3 && !STOP_WORDS.contains(token)) {
                tokens.merge(token, 1, Integer::sum);
            }
        }
        return tokens;
    }

    private double cosineSimilarity(Map<String, Double> left, Map<String, Double> right) {
        double dotProduct = 0;
        double leftMagnitude = 0;
        double rightMagnitude = 0;
        for (double value : left.values()) {
            leftMagnitude += value * value;
        }
        for (Map.Entry<String, Double> entry : right.entrySet()) {
            double value = entry.getValue();
            rightMagnitude += value * value;
            dotProduct += value * left.getOrDefault(entry.getKey(), 0.0);
        }
        if (leftMagnitude == 0 || rightMagnitude == 0) {
            return 0;
        }
        return dotProduct / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
    }

    private List<String> explainMatch(Movie movie, Map<String, Double> profile) {
        List<String> reasons = new ArrayList<>();
        if (movie.getGenres() != null) {
            movie.getGenres().stream()
                    .filter(genre -> profile.containsKey("genre:" + normalize(genre)))
                    .limit(2)
                    .forEach(genre -> reasons.add("Đúng thể loại " + genre));
        }
        if (reasons.size() < 2 && movie.getDirectors() != null) {
            movie.getDirectors().stream()
                    .filter(director -> profile.containsKey("director:" + normalize(director)))
                    .limit(1)
                    .forEach(director -> reasons.add("Cùng đạo diễn " + director));
        }
        if (reasons.isEmpty()) {
            reasons.add("Nội dung gần với những phim bạn đã đặt vé");
        }
        return List.copyOf(reasons);
    }

    private String normalize(String value) {
        if (value == null) {
            return "";
        }
        String withoutAccents = Normalizer.normalize(value.toLowerCase(Locale.ROOT), Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .replace('đ', 'd');
        return withoutAccents.trim().replaceAll("\\s+", " ");
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }

    private record ScoredMovie(Movie movie, double score, List<String> reasons) {
    }
}
