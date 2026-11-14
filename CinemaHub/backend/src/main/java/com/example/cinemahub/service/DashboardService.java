package com.example.cinemahub.service;

import com.example.cinemahub.dto.DashboardOverviewResponse;
import com.example.cinemahub.dto.DashboardOverviewResponse.*;
import com.example.cinemahub.model.*;
import com.example.cinemahub.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.lang.reflect.Method;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final BookingRepository bookingRepository;
    private final MovieRepository movieRepository;
    private final CinemaRepository cinemaRepository;
    private final ShowtimeRepository showtimeRepository;
    private final ScreenRoomRepository screenRoomRepository;
    private final UserRepository userRepository;
    private final PromotionRepository promotionRepository;

    public DashboardOverviewResponse getDashboardOverview(
            LocalDate startDate,
            LocalDate endDate,
            String cinemaIdFilter
    ) {
        LocalDateTime start = (startDate != null ? startDate : LocalDate.now().minusDays(30)).atStartOfDay();
        LocalDateTime end = (endDate != null ? endDate : LocalDate.now()).atTime(23, 59, 59);

        // 1. Load Maps an toàn tuyệt đối
        Map<String, Movie> movieMap = new HashMap<>();
        try {
            for (Movie m : movieRepository.findAll()) {
                if (m != null && m.getId() != null) movieMap.put(m.getId(), m);
            }
        } catch (Exception ignored) {}

        Map<String, Cinema> cinemaMap = new HashMap<>();
        try {
            for (Cinema c : cinemaRepository.findAll()) {
                if (c != null && c.getId() != null) cinemaMap.put(c.getId(), c);
            }
        } catch (Exception ignored) {}

        Map<String, Showtime> showtimeMap = new HashMap<>();
        try {
            for (Showtime s : showtimeRepository.findAll()) {
                if (s != null && s.getId() != null) showtimeMap.put(s.getId(), s);
            }
        } catch (Exception ignored) {}

        Map<String, ScreenRoom> roomMap = new HashMap<>();
        try {
            for (ScreenRoom r : screenRoomRepository.findAll()) {
                if (r != null && r.getId() != null) roomMap.put(r.getId(), r);
            }
        } catch (Exception ignored) {}

        Map<String, User> userMap = new HashMap<>();
        try {
            for (User u : userRepository.findAll()) {
                if (u != null && u.getId() != null) userMap.put(u.getId(), u);
            }
        } catch (Exception ignored) {}

        Map<String, Promotion> promoMap = new HashMap<>();
        try {
            for (Promotion p : promotionRepository.findAll()) {
                if (p != null && p.getCode() != null && !p.getCode().isBlank()) {
                    promoMap.put(p.getCode().toUpperCase(), p);
                }
            }
        } catch (Exception ignored) {}

        // 2. Lấy danh sách booking an toàn
        List<Booking> allBookings = Collections.emptyList();
        try {
            allBookings = bookingRepository.findAll();
        } catch (Exception ignored) {}

        // Chuẩn hóa bộ lọc rạp (loại bỏ khoảng trắng, chữ hoa/thường)
        String cleanCinemaFilter = (cinemaIdFilter != null) ? cinemaIdFilter.trim() : "ALL";
        boolean isAllCinemas = cleanCinemaFilter.isEmpty() || "ALL".equalsIgnoreCase(cleanCinemaFilter);

        List<Booking> confirmedBookings = allBookings.stream()
                .filter(Objects::nonNull)
                .filter(b -> {
                    String st = b.getStatus();
                    return st != null && (
                            "CONFIRMED".equalsIgnoreCase(st) ||
                            "PAID".equalsIgnoreCase(st) ||
                            "COMPLETED".equalsIgnoreCase(st) ||
                            "SUCCESS".equalsIgnoreCase(st)
                    );
                })
                .filter(b -> {
                    LocalDateTime created = extractDateTime(b, "getCreatedAt", "getBookingTime");
                    if (created != null) {
                        return !created.isBefore(start) && !created.isAfter(end);
                    }
                    return true;
                })
                .filter(b -> {
                    if (isAllCinemas) {
                        return true;
                    }
                    Showtime st = b.getShowtimeId() != null ? showtimeMap.get(b.getShowtimeId()) : null;
                    if (st == null) return false;
                    String stCinemaId = st.getCinemaId() != null ? st.getCinemaId().trim() : "";
                    return cleanCinemaFilter.equals(stCinemaId);
                })
                .toList();

        // 3. Summary Metrics & Daily Trends
        double totalRevenue = 0;
        double ticketRevenue = 0;
        double foodRevenue = 0;
        long totalTicketsSold = 0;

        Map<String, DailyTrendItem> dailyMap = new TreeMap<>();
        DateTimeFormatter dayFmt = DateTimeFormatter.ofPattern("yyyy-MM-dd");

        for (Booking b : confirmedBookings) {
            double bTotal = b.getTotalAmount() != null ? b.getTotalAmount() : 0.0;
            double bFood = calculateBookingFoodAmount(b);
            double bTicket = Math.max(0.0, bTotal - bFood);
            long seatsCount = 0;
            try {
                if (b.getSeats() != null) seatsCount = b.getSeats().size();
            } catch (Exception ignored) {}

            totalRevenue += bTotal;
            foodRevenue += bFood;
            ticketRevenue += bTicket;
            totalTicketsSold += seatsCount;

            LocalDateTime created = extractDateTime(b, "getCreatedAt", "getBookingTime");
            String dayKey = created != null ? created.format(dayFmt) : LocalDate.now().format(dayFmt);

            DailyTrendItem trend = dailyMap.computeIfAbsent(dayKey, k -> DailyTrendItem.builder()
                    .date(k).revenue(0).ticketsSold(0).foodRevenue(0).build());
            trend.setRevenue(trend.getRevenue() + bTotal);
            trend.setTicketsSold(trend.getTicketsSold() + seatsCount);
            trend.setFoodRevenue(trend.getFoodRevenue() + bFood);
        }

        double avgOrderValue = confirmedBookings.isEmpty() ? 0 : totalRevenue / confirmedBookings.size();

        SummaryMetrics summary = SummaryMetrics.builder()
                .totalRevenue(totalRevenue)
                .ticketRevenue(ticketRevenue)
                .foodRevenue(foodRevenue)
                .totalBookings(confirmedBookings.size())
                .totalTicketsSold(totalTicketsSold)
                .averageOrderValue(avgOrderValue)
                .build();

        // 4. Suất chiếu & Lấp đầy
        List<Showtime> periodShowtimes = showtimeMap.values().stream()
                .filter(Objects::nonNull)
                .filter(st -> {
                    if (!isAllCinemas) {
                        String stCinemaId = st.getCinemaId() != null ? st.getCinemaId().trim() : "";
                        return cleanCinemaFilter.equals(stCinemaId);
                    }
                    return true;
                })
                .toList();

        Map<String, List<Booking>> bookingsByShowtime = confirmedBookings.stream()
                .filter(b -> b.getShowtimeId() != null)
                .collect(Collectors.groupingBy(Booking::getShowtimeId));

        long totalCapacityAll = 0;
        long totalSoldAll = 0;
        List<ShowtimeRevenueItem> showtimeItems = new ArrayList<>();

        for (Showtime st : periodShowtimes) {
            ScreenRoom room = st.getRoomId() != null ? roomMap.get(st.getRoomId()) : null;
            int capacity = resolveRoomCapacity(room);

            List<Booking> stBookings = bookingsByShowtime.getOrDefault(st.getId(), Collections.emptyList());
            long sold = stBookings.stream().mapToLong(b -> b.getSeats() != null ? b.getSeats().size() : 0).sum();
            double rev = stBookings.stream().mapToDouble(b -> b.getTotalAmount() != null ? b.getTotalAmount() : 0.0).sum();
            double occ = capacity > 0 ? Math.min(100.0, (sold * 100.0) / capacity) : 0;

            totalCapacityAll += capacity;
            totalSoldAll += sold;

            Movie m = st.getMovieId() != null ? movieMap.get(st.getMovieId()) : null;
            Cinema c = st.getCinemaId() != null ? cinemaMap.get(st.getCinemaId()) : null;
            LocalDateTime stTime = extractDateTime(st, "getStartTime");

            showtimeItems.add(ShowtimeRevenueItem.builder()
                    .showtimeId(st.getId())
                    .movieTitle(m != null && m.getTitle() != null ? m.getTitle() : "Phim #" + st.getMovieId())
                    .cinemaName(c != null && c.getName() != null ? c.getName() : "Rạp #" + st.getCinemaId())
                    .roomName(room != null && room.getName() != null ? room.getName() : "Phòng chiếu")
                    .startTime(stTime != null ? stTime.toString() : "")
                    .ticketsSold(sold)
                    .totalSeats(capacity)
                    .occupancyRate(Math.round(occ * 10.0) / 10.0)
                    .revenue(rev)
                    .build());
        }
        showtimeItems.sort(Comparator.comparingDouble(ShowtimeRevenueItem::getRevenue).reversed());

        double overallOccupancyRate = totalCapacityAll > 0
                ? Math.round((totalSoldAll * 1000.0) / totalCapacityAll) / 10.0 : 0.0;

        // 5. Doanh thu theo Rạp
        Map<String, CinemaRevenueItem> cinemaRevMap = new HashMap<>();
        for (Cinema c : cinemaMap.values()) {
            cinemaRevMap.put(c.getId(), CinemaRevenueItem.builder()
                    .cinemaId(c.getId())
                    .cinemaName(c.getName() != null ? c.getName() : "Rạp " + c.getId())
                    .ticketRevenue(0)
                    .foodRevenue(0)
                    .totalRevenue(0)
                    .ticketsSold(0)
                    .occupancyRate(0)
                    .build());
        }

        for (Booking b : confirmedBookings) {
            Showtime st = b.getShowtimeId() != null ? showtimeMap.get(b.getShowtimeId()) : null;
            if (st == null || st.getCinemaId() == null) continue;
            CinemaRevenueItem item = cinemaRevMap.computeIfAbsent(st.getCinemaId().trim(), id -> CinemaRevenueItem.builder()
                    .cinemaId(id).cinemaName("Rạp " + id).build());

            double bTotal = b.getTotalAmount() != null ? b.getTotalAmount() : 0.0;
            double bFood = calculateBookingFoodAmount(b);
            double bTicket = Math.max(0.0, bTotal - bFood);
            long seats = b.getSeats() != null ? b.getSeats().size() : 0;

            item.setTicketRevenue(item.getTicketRevenue() + bTicket);
            item.setFoodRevenue(item.getFoodRevenue() + bFood);
            item.setTotalRevenue(item.getTotalRevenue() + bTotal);
            item.setTicketsSold(item.getTicketsSold() + seats);
        }

        List<CinemaRevenueItem> revenueByCinema = new ArrayList<>(cinemaRevMap.values());
        revenueByCinema.sort(Comparator.comparingDouble(CinemaRevenueItem::getTotalRevenue).reversed());

        // 6. Best-Selling Movies
        Map<String, MoviePerformanceItem> moviePerfMap = new HashMap<>();
        for (Booking b : confirmedBookings) {
            Showtime st = b.getShowtimeId() != null ? showtimeMap.get(b.getShowtimeId()) : null;
            if (st == null || st.getMovieId() == null) continue;
            String mId = st.getMovieId();
            Movie m = movieMap.get(mId);

            MoviePerformanceItem mItem = moviePerfMap.computeIfAbsent(mId, id -> MoviePerformanceItem.builder()
                    .movieId(id)
                    .title(m != null && m.getTitle() != null ? m.getTitle() : "Phim " + id)
                    .posterUrl(m != null && m.getPosterUrl() != null ? m.getPosterUrl() : "")
                    .ticketsSold(0)
                    .revenue(0)
                    .occupancyRate(0)
                    .showtimeCount(0)
                    .build());

            long seats = b.getSeats() != null ? b.getSeats().size() : 0;
            double rev = b.getTotalAmount() != null ? b.getTotalAmount() : 0.0;
            mItem.setTicketsSold(mItem.getTicketsSold() + seats);
            mItem.setRevenue(mItem.getRevenue() + rev);
        }

        List<MoviePerformanceItem> bestSellingMovies = new ArrayList<>(moviePerfMap.values());
        bestSellingMovies.sort(Comparator.comparingLong(MoviePerformanceItem::getTicketsSold).reversed());

        // 7. Customer Statistics
        List<User> customers = userMap.values().stream()
                .filter(Objects::nonNull)
                .filter(u -> u.getRole() != null && "CUSTOMER".equalsIgnoreCase(u.getRole().trim()))
                .toList();

        Map<String, Long> tierCountMap = customers.stream()
                .collect(Collectors.groupingBy(
                        u -> u.getMembershipTier() != null && !u.getMembershipTier().isBlank()
                                ? u.getMembershipTier().toUpperCase() : "BRONZE",
                        Collectors.counting()
                ));

        List<TierDistribution> tierDistributions = tierCountMap.entrySet().stream()
                .map(e -> TierDistribution.builder().tierName(e.getKey()).count(e.getValue()).build())
                .sorted(Comparator.comparingLong(TierDistribution::getCount).reversed())
                .toList();

        long totalPointsIssued = customers.stream()
                .mapToLong(u -> u.getRewardPoints() != null ? u.getRewardPoints() : 0)
                .sum();

        Map<String, List<Booking>> bookingsByUser = confirmedBookings.stream()
                .filter(b -> b.getUserId() != null && !b.getUserId().isBlank())
                .collect(Collectors.groupingBy(Booking::getUserId));

        List<TopCustomerItem> topCustomers = bookingsByUser.entrySet().stream()
                .map(entry -> {
                    User u = userMap.get(entry.getKey());
                    double spent = entry.getValue().stream()
                            .mapToDouble(b -> b.getTotalAmount() != null ? b.getTotalAmount() : 0.0)
                            .sum();
                    String displayName = (u != null && u.getUsername() != null && !u.getUsername().isBlank())
                            ? u.getUsername()
                            : (u != null && u.getEmail() != null ? u.getEmail() : "Khách hàng");
                    return TopCustomerItem.builder()
                            .userId(entry.getKey())
                            .fullName(displayName)
                            .email(u != null && u.getEmail() != null ? u.getEmail() : "")
                            .tier(u != null && u.getMembershipTier() != null ? u.getMembershipTier() : "BRONZE")
                            .bookingCount(entry.getValue().size())
                            .totalSpent(spent)
                            .build();
                })
                .sorted(Comparator.comparingDouble(TopCustomerItem::getTotalSpent).reversed())
                .limit(5)
                .toList();

        CustomerStats customerStats = CustomerStats.builder()
                .totalCustomers(customers.size())
                .activeCustomersInPeriod(bookingsByUser.size())
                .totalPointsIssued(totalPointsIssued)
                .tierDistribution(tierDistributions)
                .topCustomers(topCustomers)
                .build();

        // 8. Promotion Performance
        Map<String, PromotionPerformanceItem> promoPerfMap = new HashMap<>();
        for (Booking b : confirmedBookings) {
            String code = b.getPromoCode();
            if (code == null || code.isBlank()) continue;

            Promotion p = promoMap.get(code.toUpperCase());
            PromotionPerformanceItem pItem = promoPerfMap.computeIfAbsent(code.toUpperCase(), c -> PromotionPerformanceItem.builder()
                    .promoCode(c)
                    .description(p != null && p.getDescription() != null ? p.getDescription() : "Mã ưu đãi " + c)
                    .usageCount(0)
                    .totalDiscountGiven(0)
                    .generatedRevenue(0)
                    .build());

            double discount = b.getDiscountAmount() != null ? b.getDiscountAmount() : 0.0;
            double rev = b.getTotalAmount() != null ? b.getTotalAmount() : 0.0;

            pItem.setUsageCount(pItem.getUsageCount() + 1);
            pItem.setTotalDiscountGiven(pItem.getTotalDiscountGiven() + discount);
            pItem.setGeneratedRevenue(pItem.getGeneratedRevenue() + rev);
        }

        List<PromotionPerformanceItem> promotionPerformance = new ArrayList<>(promoPerfMap.values());
        promotionPerformance.sort(Comparator.comparingLong(PromotionPerformanceItem::getUsageCount).reversed());

        return DashboardOverviewResponse.builder()
                .summary(summary)
                .dailyTrends(new ArrayList<>(dailyMap.values()))
                .revenueByCinema(revenueByCinema)
                .revenueByShowtime(showtimeItems.stream().limit(15).toList())
                .bestSellingMovies(bestSellingMovies.stream().limit(10).toList())
                .overallOccupancyRate(overallOccupancyRate)
                .customerStats(customerStats)
                .promotionPerformance(promotionPerformance)
                .build();
    }

    private LocalDateTime extractDateTime(Object target, String... methodNames) {
        if (target == null) return null;
        for (String name : methodNames) {
            try {
                Method m = target.getClass().getMethod(name);
                Object val = m.invoke(target);
                if (val instanceof LocalDateTime ldt) return ldt;
                if (val instanceof Date d) return d.toInstant().atZone(ZoneId.systemDefault()).toLocalDateTime();
                if (val instanceof Instant inst) return inst.atZone(ZoneId.systemDefault()).toLocalDateTime();
            } catch (Exception ignored) {
            }
        }
        return null;
    }

    private double calculateBookingFoodAmount(Booking b) {
        if (b == null) return 0.0;
        try {
            if (b.getFoodItems() == null) return 0.0;
            double sum = 0.0;
            for (Object fi : b.getFoodItems()) {
                if (fi == null) continue;
                double price = extractDouble(fi, "getUnitPrice", "getPrice", "getBasePrice", "getSubtotal");
                int qty = extractInt(fi, "getQuantity", "getQty");
                if (qty <= 0) qty = 1;
                sum += price * qty;
            }
            return sum;
        } catch (Exception e) {
            return 0.0;
        }
    }

    private int resolveRoomCapacity(ScreenRoom room) {
        if (room == null) return 60;
        int cap = extractInt(room, "getTotalSeats", "getSeatCount", "getCapacity");
        if (cap > 0) return cap;
        int rows = extractInt(room, "getRows", "getRowCount");
        int cols = extractInt(room, "getColumns", "getCols", "getSeatsPerRow");
        return (rows > 0 && cols > 0) ? (rows * cols) : 60;
    }

    private double extractDouble(Object target, String... methodNames) {
        if (target == null) return 0.0;
        for (String name : methodNames) {
            try {
                Method m = target.getClass().getMethod(name);
                Object val = m.invoke(target);
                if (val instanceof Number num) return num.doubleValue();
            } catch (Exception ignored) {
            }
        }
        return 0.0;
    }

    private int extractInt(Object target, String... methodNames) {
        if (target == null) return 0;
        for (String name : methodNames) {
            try {
                Method m = target.getClass().getMethod(name);
                Object val = m.invoke(target);
                if (val instanceof Number num) return num.intValue();
            } catch (Exception ignored) {
            }
        }
        return 0;
    }
}