package com.example.cinemahub;

import com.example.cinemahub.model.User;
import com.example.cinemahub.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Arrays;
import java.util.Date;
import java.util.Optional;

@SpringBootApplication
public class CinemaHubApplication {

	public static void main(String[] args) {
		SpringApplication.run(CinemaHubApplication.class, args);
	}

	@Bean
	public CommandLineRunner dataSeeder(UserRepository userRepository, PasswordEncoder passwordEncoder) {
		return args -> {
            Optional<User> adminOpt = userRepository.findByEmail("admin@cinemahub.com");
			if (adminOpt.isEmpty()) {
				System.out.println("Seeding Admin User...");
				User admin = new User();
				admin.setUsername("Admin");
				admin.setEmail("admin@cinemahub.com");
				admin.setPassword(passwordEncoder.encode("1"));
				admin.setRole("Admin");
				admin.setIsVerified(true);
				admin.setPermissions(Arrays.asList("manage_movies", "manage_showtimes", "manage_bookings", "manage_users", "view_reports"));
				admin.setCreatedAt(new Date());
				admin.setUpdatedAt(new Date());
				userRepository.save(admin);
				System.out.println("Admin User seeded successfully with password: 1!");
            } else {
                // Update password for existing admin
                User admin = adminOpt.get();
                admin.setPassword(passwordEncoder.encode("1"));
                userRepository.save(admin);
                System.out.println("Admin password updated to 1");
            }

            // Seed Manager
            Optional<User> managerOpt = userRepository.findByEmail("manager@cinemahub.com");
            if (managerOpt.isEmpty()) {
                System.out.println("Seeding Manager User...");
                User manager = new User();
                manager.setUsername("Manager");
                manager.setEmail("manager@cinemahub.com");
                manager.setPassword(passwordEncoder.encode("1"));
                manager.setRole("Manager");
                manager.setIsVerified(true);
                manager.setPermissions(Arrays.asList("manage_movies", "manage_showtimes", "manage_bookings", "view_reports"));
                manager.setCreatedAt(new Date());
                manager.setUpdatedAt(new Date());
                userRepository.save(manager);
                System.out.println("Manager User seeded successfully with password: 1!");
            } else {
                User manager = managerOpt.get();
                manager.setPassword(passwordEncoder.encode("1"));
                userRepository.save(manager);
            }

            // Seed Staff
            Optional<User> staffOpt = userRepository.findByEmail("staff@cinemahub.com");
            if (staffOpt.isEmpty()) {
                System.out.println("Seeding Staff User...");
                User staff = new User();
                staff.setUsername("Staff");
                staff.setEmail("staff@cinemahub.com");
                staff.setPassword(passwordEncoder.encode("1"));
                staff.setRole("Staff");
                staff.setIsVerified(true);
                staff.setPermissions(Arrays.asList("manage_bookings"));
                staff.setCreatedAt(new Date());
                staff.setUpdatedAt(new Date());
                userRepository.save(staff);
                System.out.println("Staff User seeded successfully with password: 1!");
            } else {
                User staff = staffOpt.get();
                staff.setPassword(passwordEncoder.encode("1"));
                userRepository.save(staff);
            }
		};
	}
}
