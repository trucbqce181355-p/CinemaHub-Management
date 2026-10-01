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
@org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(name="app.seed-data", havingValue="true")
public class DatabaseSeeder {

    @Bean
    CommandLineRunner initDatabase(
            CinemaRepository cinemaRepository,
            ScreenRoomRepository screenRoomRepository,
            PromotionRepository promotionRepository) {
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
            
            System.out.println("====== SEEDER COMPLETED: Mock data has been inserted into MongoDB ======");
        };
    }
}

