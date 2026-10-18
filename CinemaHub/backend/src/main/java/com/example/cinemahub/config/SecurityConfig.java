package com.example.cinemahub.config;

import com.example.cinemahub.security.JwtFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, JwtFilter jwtFilter) throws Exception {
        http
           
            .cors(Customizer.withDefaults())
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/movies/**").permitAll()
                .requestMatchers("/api/cinemas/**").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/showtimes/**").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/bookings/seats").permitAll()
                .requestMatchers("/api/bookings/counter-booking").hasAnyRole("Staff", "Manager", "Admin")
                .requestMatchers("/api/bookings/**").authenticated()
                .requestMatchers("/api/tickets/**").hasAnyRole("Staff", "Manager", "Admin")
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/promotions/**").permitAll()
                .requestMatchers("/api/food-beverage/**").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/membership/tiers").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/membership/rules").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/membership/rewards").permitAll()
                .requestMatchers("/api/membership/adjust-points", "/api/membership/admin/**", "/api/membership/all-tiers", "/api/membership/all-rewards").hasRole("Manager")
                .requestMatchers("/api/membership/**").authenticated()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/payment/vnpay-ipn").permitAll()
                .requestMatchers("/api/payment/**").authenticated()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/reviews/movie/**").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/reviews/recommendations").permitAll()
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowCredentials(true);
        config.setAllowedOrigins(List.of("http://localhost:5173", "http://127.0.0.1:5173"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
