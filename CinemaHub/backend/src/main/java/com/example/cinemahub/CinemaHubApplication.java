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

@SpringBootApplication
public class CinemaHubApplication {

	public static void main(String[] args) {
		SpringApplication.run(CinemaHubApplication.class, args);
	}

	@Bean
	public CommandLineRunner dataSeeder(UserRepository userRepository, PasswordEncoder passwordEncoder) {
		return args -> {
            userRepository.deleteAll(); // Temporary: Clear old nodejs documents
			if (userRepository.findByEmail("admin@cinemahub.com").isEmpty()) {
				System.out.println("Seeding Admin User...");
				User admin = new User();
				admin.setUsername("Admin");
				admin.setEmail("admin@cinemahub.com");
				admin.setPassword(passwordEncoder.encode("password123"));
				admin.setRole("Admin");
				admin.setIsVerified(true);
				admin.setPermissions(Arrays.asList("manage_movies", "manage_showtimes", "manage_bookings", "manage_users", "view_reports"));
				admin.setCreatedAt(new Date());
				admin.setUpdatedAt(new Date());
				userRepository.save(admin);
				System.out.println("Admin User seeded successfully!");
			}
		};
	}
}
