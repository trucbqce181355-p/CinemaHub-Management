
package com.example.cinemahub.controller;

import com.example.cinemahub.dto.MovieChatRequest;
import com.example.cinemahub.dto.MovieChatResponse;
import com.example.cinemahub.dto.MovieRecommendationResponse;
import com.example.cinemahub.service.MovieRecommendationService;

import jakarta.validation.Valid;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/recommendations")
public class MovieRecommendationController {

    private final MovieRecommendationService recommendationService;

    public MovieRecommendationController(
            MovieRecommendationService recommendationService) {
        this.recommendationService = recommendationService;
    }

    /**
     * Get personalized movie recommendations for current customer.
     */
    @GetMapping("/me")
    public List<MovieRecommendationResponse> getRecommendations(
            Authentication authentication,
            @RequestParam(defaultValue = "8") int limit) {

        return recommendationService.recommendForCustomer(
                authentication.getName(),
                limit
        );
    }

    /**
     * Chat with AI Movie Assistant to search and recommend movies.
     */
    @PostMapping("/chat")
    public MovieChatResponse chat(
            Authentication authentication,
            @Valid @RequestBody MovieChatRequest request) {

        return recommendationService.chat(
                authentication.getName(),
                request.message()
        );
    }
}
