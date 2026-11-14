
package com.example.cinemahub.dto;

import java.util.List;

public record MovieChatResponse(
        String answer,
        List<MovieRecommendationResponse> recommendations
) {
}
