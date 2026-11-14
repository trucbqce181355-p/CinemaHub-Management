package com.example.cinemahub.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import com.example.cinemahub.repository.UserRepository;
import com.example.cinemahub.model.User;
import java.util.Optional;

import java.io.IOException;
import java.util.List;
import java.util.ArrayList;
import java.util.stream.Collectors;

@Component
public class JwtFilter extends OncePerRequestFilter {

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private UserRepository userRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            try {
                var claims = jwtUtil.extractClaims(token);
                String userId = claims.get("id", String.class);

                // Check Database to ensure user is not locked or unverified and load live role/permissions
                Optional<User> userOpt = userRepository.findById(userId);
                if (userOpt.isPresent()) {
                    User user = userOpt.get();
                    if (!"Locked".equals(user.getStatus()) && Boolean.TRUE.equals(user.getIsVerified())) {
                        List<SimpleGrantedAuthority> authorities = new ArrayList<>();
                        String userRole = user.getRole() != null ? user.getRole() : "Customer";
                        authorities.add(new SimpleGrantedAuthority("ROLE_" + userRole));

                        List<String> userPermissions = user.getPermissions();
                        if (userPermissions != null) {
                            authorities.addAll(userPermissions.stream()
                                    .map(SimpleGrantedAuthority::new)
                                    .collect(Collectors.toList()));

                            // Map standalone custom role permissions to internal Spring Security route roles
                            if (!List.of("Customer", "Staff", "Manager", "Admin").contains(userRole)) {
                                boolean hasManagerPerm = userPermissions.stream().anyMatch(p ->
                                        List.of("manage_movies", "manage_showtimes", "view_reports", "manage_users").contains(p));
                                if (hasManagerPerm) {
                                    authorities.add(new SimpleGrantedAuthority("ROLE_Manager"));
                                    authorities.add(new SimpleGrantedAuthority("ROLE_Staff"));
                                } else if (userPermissions.contains("manage_bookings")) {
                                    authorities.add(new SimpleGrantedAuthority("ROLE_Staff"));
                                }
                            }
                        }

                        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                                userId, null, authorities);
                        SecurityContextHolder.getContext().setAuthentication(auth);
                    }
                }
            } catch (Exception e) {
                // Invalid token
            }
        }
        filterChain.doFilter(request, response);
    }
}
