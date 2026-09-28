package com.example.cinemahub.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;
import java.util.List;

@Component
public class JwtUtil {
    private final Key key = Keys.hmacShaKeyFor("CinemaHubSuperSecretKeyThatIsAtLeast32BytesLongForHS256Algorithm123!".getBytes());
    private final long EXPIRATION_TIME = 900000; // 15m

    public String generateToken(String userId, String role, List<String> permissions) {
        return Jwts.builder()
                .claim("id", userId)
                .claim("role", role)
                .claim("permissions", permissions)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + EXPIRATION_TIME))
                .signWith(key)
                .compact();
    }

    public Claims extractClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
}
