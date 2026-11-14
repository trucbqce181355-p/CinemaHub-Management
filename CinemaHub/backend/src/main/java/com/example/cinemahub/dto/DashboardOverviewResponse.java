package com.example.cinemahub.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardOverviewResponse {

    // 1. View Revenue Dashboard & 2. Ticket Sales Statistics
    private SummaryMetrics summary;
    private List<DailyTrendItem> dailyTrends;

    // 3. View Revenue Analysis (theo Rạp / Phim / Suất chiếu)
    private List<CinemaRevenueItem> revenueByCinema;
    private List<ShowtimeRevenueItem> revenueByShowtime;

    // 4. View Best-Selling Movies & 5. View Occupancy Rate
    private List<MoviePerformanceItem> bestSellingMovies;
    private double overallOccupancyRate;

    // 6. View Customer Statistics & Loyalty
    private CustomerStats customerStats;

    // 7. View Promotion Performance
    private List<PromotionPerformanceItem> promotionPerformance;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SummaryMetrics {
        private double totalRevenue;
        private double ticketRevenue;
        private double foodRevenue;
        private long totalBookings;
        private long totalTicketsSold;
        private double averageOrderValue;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailyTrendItem {
        private String date;
        private double revenue;
        private long ticketsSold;
        private double foodRevenue;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CinemaRevenueItem {
        private String cinemaId;
        private String cinemaName;
        private double ticketRevenue;
        private double foodRevenue;
        private double totalRevenue;
        private long ticketsSold;
        private double occupancyRate;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ShowtimeRevenueItem {
        private String showtimeId;
        private String movieTitle;
        private String cinemaName;
        private String roomName;
        private String startTime;
        private long ticketsSold;
        private int totalSeats;
        private double occupancyRate;
        private double revenue;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MoviePerformanceItem {
        private String movieId;
        private String title;
        private String posterUrl;
        private long ticketsSold;
        private double revenue;
        private double occupancyRate;
        private long showtimeCount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CustomerStats {
        private long totalCustomers;
        private long activeCustomersInPeriod;
        private long totalPointsIssued;
        private List<TierDistribution> tierDistribution;
        private List<TopCustomerItem> topCustomers;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TierDistribution {
        private String tierName;
        private long count;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TopCustomerItem {
        private String userId;
        private String fullName;
        private String email;
        private String tier;
        private long bookingCount;
        private double totalSpent;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PromotionPerformanceItem {
        private String promoCode;
        private String description;
        private long usageCount;
        private double totalDiscountGiven;
        private double generatedRevenue;
    }
}