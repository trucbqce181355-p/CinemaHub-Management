package com.example.cinemahub.config;

import com.example.cinemahub.model.*;
import com.example.cinemahub.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Map;

@Configuration
public class DatabaseSeeder {

    @Bean
    CommandLineRunner initDatabase(
            CinemaRepository cinemaRepository,
            ScreenRoomRepository screenRoomRepository,
            PromotionRepository promotionRepository,
            MovieRepository movieRepository,
            ReviewRepository reviewRepository) {
        return args -> {
            if (cinemaRepository.count() == 0) {
                Cinema cgv = new Cinema();
                cgv.setName("CGV Landmark 81");
                cgv.setAddress("Vinhomes Central Park, Bình Thạnh, TP.HCM");
                cgv.setContactPhone("1900 1234");
                cgv.setStatus("Active");
                cgv.setFacilities(Arrays.asList("Parking", "Food Court", "Wheelchair Accessible"));
                cgv.setMapCoordinates(Map.of("lat", 10.795, "lng", 106.722));
                cinemaRepository.save(cgv);

                Cinema lotte = new Cinema();
                lotte.setName("Lotte Cinema Gò Vấp");
                lotte.setAddress("Lotte Mart Gò Vấp, Nguyễn Văn Lượng, TP.HCM");
                lotte.setContactPhone("1900 5678");
                lotte.setStatus("Active");
                lotte.setFacilities(Arrays.asList("Parking", "Arcade"));
                lotte.setMapCoordinates(Map.of("lat", 10.835, "lng", 106.671));
                cinemaRepository.save(lotte);

                ScreenRoom room1 = new ScreenRoom();
                room1.setCinemaId(cgv.getId());
                room1.setName("Phòng 1 (IMAX)");
                room1.setScreenType("IMAX");
                room1.setCapacity(250);
                room1.setStatus("Active");
                screenRoomRepository.save(room1);

                ScreenRoom room2 = new ScreenRoom();
                room2.setCinemaId(cgv.getId());
                room2.setName("Phòng 2 (3D)");
                room2.setScreenType("3D");
                room2.setCapacity(150);
                room2.setStatus("Active");
                screenRoomRepository.save(room2);
            }

            if (promotionRepository.count() == 0) {
                Promotion p1 = new Promotion();
                p1.setCode("GIAM50K");
                p1.setTitle("Giảm 50K cho bạn mới");
                p1.setDiscountType("FIXED_AMOUNT");
                p1.setDiscountValue(50000.0);
                p1.setStartDate(LocalDateTime.now().minusDays(1));
                p1.setEndDate(LocalDateTime.now().plusDays(30));
                p1.setStatus("Active");
                p1.setConditions(Map.of("minSpend", 200000));
                promotionRepository.save(p1);
            }

            if (reviewRepository.count() == 0) {
                var movies = movieRepository.findAll();
                if (!movies.isEmpty()) {
                    Movie m1 = movies.get(0);
                    Review r1 = new Review();
                    r1.setMovieId(m1.getId());
                    r1.setMovieTitle(m1.getTitle());
                    r1.setMoviePoster(m1.getPosterUrl());
                    r1.setUserId("user_demo_1");
                    r1.setUserName("Nguyễn Văn An");
                    r1.setUserEmail("an.nguyen@gmail.com");
                    r1.setRating(10);
                    r1.setTitle("Kỹ xảo và âm thanh quá đỉnh!");
                    r1.setComment("Phim quá xuất sắc, kỹ xảo hoành tráng và âm thanh rạp xem cực kỳ đã tai!");
                    r1.setTags(Arrays.asList("Đồ họa đỉnh", "Kịch tính", "Âm thanh hay"));
                    r1.setIsVerifiedWatcher(true);
                    r1.setStatus("PUBLISHED");
                    r1.setCreatedAt(LocalDateTime.now().minusDays(2));
                    r1.setEditDeadline(LocalDateTime.now().plusHours(40));
                    reviewRepository.save(r1);

                    Review r2 = new Review();
                    r2.setMovieId(m1.getId());
                    r2.setMovieTitle(m1.getTitle());
                    r2.setMoviePoster(m1.getPosterUrl());
                    r2.setUserId("user_demo_2");
                    r2.setUserName("Trần Thị Mai");
                    r2.setUserEmail("mai.tran@gmail.com");
                    r2.setRating(8);
                    r2.setTitle("Cảm động và ý nghĩa");
                    r2.setComment("Cốt truyện cảm động, các diễn viên diễn xuất tự nhiên. Rất đáng tiền vé!");
                    r2.setTags(Arrays.asList("Cảm động", "Diễn xuất tốt"));
                    r2.setIsVerifiedWatcher(true);
                    r2.setStatus("PUBLISHED");
                    r2.setCreatedAt(LocalDateTime.now().minusDays(1));
                    r2.setEditDeadline(LocalDateTime.now().plusHours(35));
                    reviewRepository.save(r2);

                    Review r3 = new Review();
                    r3.setMovieId(m1.getId());
                    r3.setMovieTitle(m1.getTitle());
                    r3.setMoviePoster(m1.getPosterUrl());
                    r3.setUserId("user_spammer");
                    r3.setUserName("Spam Bot 99");
                    r3.setUserEmail("spambot@example.com");
                    r3.setRating(2);
                    r3.setTitle("Khuyến mãi đặc biệt");
                    r3.setComment("Truy cập ngay web cá cược abcxyz nhận tiền liền tay, link rác lừa đảo!");
                    r3.setStatus("REJECTED");
                    r3.setIsVerifiedWatcher(false);
                    r3.setViolationReason("Quảng cáo spam / Lừa đảo vi phạm tiêu chuẩn cộng đồng");
                    r3.setFlaggedKeywords(Arrays.asList("cá cược", "lừa đảo"));
                    r3.setCreatedAt(LocalDateTime.now().minusHours(5));
                    reviewRepository.save(r3);

                    // Một review nghi vấn cần Manager duyệt (PENDING_MODERATION)
                    Review rModeration = new Review();
                    rModeration.setMovieId(m1.getId());
                    rModeration.setMovieTitle(m1.getTitle());
                    rModeration.setMoviePoster(m1.getPosterUrl());
                    rModeration.setUserId("user_demo_4");
                    rModeration.setUserName("Hoàng Minh");
                    rModeration.setUserEmail("hoang.minh@gmail.com");
                    rModeration.setRating(7);
                    rModeration.setTitle("Nội dung hay nhưng so với rạp khác");
                    rModeration.setComment("Phim chiếu khá ổn, nhưng giá vé so với bên lotte cinema có phần đắt hơn một chút.");
                    rModeration.setStatus("PENDING_MODERATION");
                    rModeration.setIsVerifiedWatcher(true);
                    rModeration.setFlaggedKeywords(Arrays.asList("lotte"));
                    rModeration.setViolationReason("Chứa từ khóa nghi vấn đối thủ (lotte)");
                    rModeration.setCreatedAt(LocalDateTime.now().minusHours(2));
                    reviewRepository.save(rModeration);

                    if (movies.size() > 1) {
                        Movie m2 = movies.get(1);
                        Review r4 = new Review();
                        r4.setMovieId(m2.getId());
                        r4.setMovieTitle(m2.getTitle());
                        r4.setMoviePoster(m2.getPosterUrl());
                        r4.setUserId("user_demo_3");
                        r4.setUserName("Lê Hoàng Nam");
                        r4.setUserEmail("nam.le@gmail.com");
                        r4.setRating(10);
                        r4.setTitle("Tuyệt phẩm không thể bỏ lỡ");
                        r4.setComment("Tuyệt phẩm điện ảnh! Xem đi xem lại không chán, 10/10!");
                        r4.setTags(Arrays.asList("Hài hước", "Kịch tính"));
                        r4.setIsVerifiedWatcher(true);
                        r4.setStatus("PUBLISHED");
                        r4.setCreatedAt(LocalDateTime.now().minusDays(3));
                        reviewRepository.save(r4);
                    }
                }
            }
            
            System.out.println("====== SEEDER COMPLETED: Mock data has been inserted into MongoDB ======");
        };
    }
}

