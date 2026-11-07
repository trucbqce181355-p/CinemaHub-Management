package com.example.cinemahub.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record ProgramStatusRequest(
        @NotBlank @Pattern(regexp = "Active|Disabled") String status,
        Long version) {}
