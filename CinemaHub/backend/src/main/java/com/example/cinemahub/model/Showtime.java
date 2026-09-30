package com.example.cinemahub.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

@Data
@Document(collection = "showtimes")
public class Showtime {
    @Id
    private String id;

    @NotBlank(message = "Movie ID không được để trống")
    private String movieId;

    private String movieTitle;
    private String moviePoster;

    @NotBlank(message = "Cinema ID không được để trống")
    private String cinemaId;

    private String cinemaName;

    @NotBlank(message = "Room ID không được để trống")
    private String roomId;

    private String roomName;

    @NotNull(message = "Thời gian bắt đầu không được để trống")
    private LocalDateTime startTime;

    private LocalDateTime endTime;

    private String format = "2D"; // 2D, 3D, IMAX

    private Double basePrice = 90000.0;

    private String status = "Active"; // Active, Cancelled
}
