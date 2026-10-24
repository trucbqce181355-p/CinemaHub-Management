package com.example.cinemahub.dto;

import com.example.cinemahub.model.Movie;
import java.util.List;

/** A movie suggestion together with a human-readable explanation. */
public record MovieRecommendationResponse(
        Movie movie,
        int matchPercent,
        List<String> reasons,
        boolean personalized) {
}
