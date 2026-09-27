package com.example.cinemahub.controller;

import com.example.cinemahub.model.User;
import com.example.cinemahub.repository.UserRepository;
import com.example.cinemahub.security.JwtUtil;
import com.example.cinemahub.service.EmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Date;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private PasswordEncoder passwordEncoder;
    
    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private EmailService emailService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String password = body.get("password");
        
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of("message", "Invalid credentials"));
        }
        
        User user = userOpt.get();
        if ("Locked".equals(user.getStatus())) {
            return ResponseEntity.status(403).body(Map.of("message", "Account is locked"));
        }
        
        if (!passwordEncoder.matches(password, user.getPassword())) {
            return ResponseEntity.status(401).body(Map.of("message", "Invalid credentials"));
        }
        
        String token = jwtUtil.generateToken(user.getId(), user.getRole(), user.getPermissions());
        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
        response.put("id", user.getId());
        response.put("username", user.getUsername());
        response.put("email", user.getEmail());
        response.put("role", user.getRole());
        response.put("permissions", user.getPermissions());
        
        return ResponseEntity.ok(response);
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody User user) {
        if (userRepository.findByEmail(user.getEmail()).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email already exists"));
        }
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        user.setCreatedAt(new Date());
        user.setUpdatedAt(new Date());
        userRepository.save(user);
        
        String token = jwtUtil.generateToken(user.getId(), user.getRole(), user.getPermissions());
        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
        response.put("id", user.getId());
        response.put("username", user.getUsername());
        response.put("email", user.getEmail());
        response.put("role", user.getRole());
        
        return ResponseEntity.status(201).body(response);
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "User with that email does not exist"));
        }
        User user = userOpt.get();
        String otp = String.format("%06d", (int)(Math.random() * 1000000));
        user.setOtp(otp);
        user.setOtpExpires(new Date(System.currentTimeMillis() + 10 * 60 * 1000)); // 10 mins
        userRepository.save(user);
        
        String message = "You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n" +
                         "Your OTP for password reset is: " + otp + "\n\n" +
                         "This OTP is valid for 10 minutes.";
        
        try {
            emailService.sendEmail(user.getEmail(), "Password Reset OTP", message);
            return ResponseEntity.ok(Map.of("message", "Email sent"));
        } catch (Exception e) {
            user.setOtp(null);
            user.setOtpExpires(null);
            userRepository.save(user);
            return ResponseEntity.status(500).body(Map.of("message", "Email could not be sent"));
        }
    }

    @PostMapping("/verify-reset-otp")
    public ResponseEntity<?> verifyOtp(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String otp = body.get("otp");
        
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "User not found"));
        }
        User user = userOpt.get();
        if (user.getOtp() == null || !user.getOtp().equals(otp) || user.getOtpExpires().before(new Date())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid or expired OTP"));
        }
        
        return ResponseEntity.ok(Map.of("message", "OTP verified successfully"));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String otp = body.get("otp");
        String password = body.get("password");
        
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "User not found"));
        }
        User user = userOpt.get();
        if (user.getOtp() == null || !user.getOtp().equals(otp) || user.getOtpExpires().before(new Date())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid or expired OTP"));
        }
        
        user.setPassword(passwordEncoder.encode(password));
        user.setOtp(null);
        user.setOtpExpires(null);
        userRepository.save(user);
        
        return ResponseEntity.ok(Map.of("message", "Password updated successfully"));
    }
}
