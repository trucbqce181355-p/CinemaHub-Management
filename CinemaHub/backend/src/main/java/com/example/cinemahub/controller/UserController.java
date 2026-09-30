package com.example.cinemahub.controller;

import com.example.cinemahub.model.User;
import com.example.cinemahub.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Date;
import org.springframework.security.core.context.SecurityContextHolder;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private boolean isProtectedAccount(User user) {
        return "Admin".equals(user.getRole());
    }

    @GetMapping
    @PreAuthorize("hasAuthority('manage_users')")
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(userRepository.findAll());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('manage_users')")
    public ResponseEntity<?> createUser(@RequestBody User user) {
        if (userRepository.findByEmail(user.getEmail()).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email already exists"));
        }
        if (user.getPassword() != null && !user.getPassword().isEmpty()) {
            user.setPassword(passwordEncoder.encode(user.getPassword()));
        }
        user.setIsVerified(true);
        user.setCreatedAt(new Date());
        user.setUpdatedAt(new Date());
        return ResponseEntity.status(201).body(userRepository.save(user));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('manage_users')")
    public ResponseEntity<?> updateUser(@PathVariable String id, @RequestBody User userDetails) {
        Optional<User> userOpt = userRepository.findById(id);
        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        User user = userOpt.get();
        
        // Prevent modifying protected accounts' role or status
        if (isProtectedAccount(user)) {
            // Can only update non-critical fields for themselves if needed, but for manage_users this is usually blocked.
            return ResponseEntity.status(403).body(Map.of("message", "Cannot modify protected core accounts"));
        }

        if (userDetails.getUsername() != null) user.setUsername(userDetails.getUsername());
        if (userDetails.getEmail() != null) user.setEmail(userDetails.getEmail());
        if (userDetails.getRole() != null) user.setRole(userDetails.getRole());
        if (userDetails.getStatus() != null) user.setStatus(userDetails.getStatus());
        if (userDetails.getPermissions() != null) user.setPermissions(userDetails.getPermissions());
        if (userDetails.getPhoneNumber() != null) user.setPhoneNumber(userDetails.getPhoneNumber());
        
        user.setUpdatedAt(new Date());
        return ResponseEntity.ok(userRepository.save(user));
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAuthority('manage_users')")
    public ResponseEntity<?> updateStatus(@PathVariable String id, @RequestBody Map<String, String> body) {
        Optional<User> userOpt = userRepository.findById(id);
        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        User user = userOpt.get();
        if (isProtectedAccount(user)) {
            return ResponseEntity.status(403).body(Map.of("message", "Cannot modify status of protected core accounts"));
        }
        user.setStatus(body.get("status"));
        user.setUpdatedAt(new Date());
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "User status updated"));
    }

    @PutMapping("/{id}/role")
    @PreAuthorize("hasAuthority('manage_users')")
    public ResponseEntity<?> updateRole(@PathVariable String id, @RequestBody Map<String, Object> body) {
        Optional<User> userOpt = userRepository.findById(id);
        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        User user = userOpt.get();
        if (isProtectedAccount(user)) {
            return ResponseEntity.status(403).body(Map.of("message", "Cannot modify role/permissions of protected core accounts"));
        }
        if (body.containsKey("role")) {
            user.setRole((String) body.get("role"));
        }
        if (body.containsKey("permissions")) {
            user.setPermissions((List<String>) body.get("permissions"));
        }
        user.setUpdatedAt(new Date());
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "User role updated"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('manage_users')")
    public ResponseEntity<?> deleteUser(@PathVariable String id) {
        Optional<User> userOpt = userRepository.findById(id);
        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        if (isProtectedAccount(userOpt.get())) {
            return ResponseEntity.status(403).body(Map.of("message", "Cannot delete protected core accounts"));
        }
        userRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "User deleted successfully"));
    }

    // PROFILE ENDPOINTS FOR CURRENT USER
    @GetMapping("/profile")
    public ResponseEntity<?> getProfile() {
        String userId = SecurityContextHolder.getContext().getAuthentication().getName();
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(userOpt.get());
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(@RequestBody Map<String, String> body) {
        String userId = SecurityContextHolder.getContext().getAuthentication().getName();
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        User user = userOpt.get();
        if (body.containsKey("username")) user.setUsername(body.get("username"));
        if (body.containsKey("email")) {
            String newEmail = body.get("email");
            if (!newEmail.equals(user.getEmail())) {
                if (userRepository.findByEmail(newEmail).isPresent()) {
                    return ResponseEntity.badRequest().body(Map.of("message", "Email đã được sử dụng bởi tài khoản khác"));
                }
                user.setEmail(newEmail);
            }
        }
        if (body.containsKey("phoneNumber")) user.setPhoneNumber(body.get("phoneNumber"));
        if (body.containsKey("dateOfBirth")) {
            try {
                user.setDateOfBirth(new java.text.SimpleDateFormat("yyyy-MM-dd").parse(body.get("dateOfBirth")));
            } catch (Exception e) {
                // Ignore invalid date
            }
        }
        user.setUpdatedAt(new Date());
        return ResponseEntity.ok(userRepository.save(user));
    }

    @PutMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody Map<String, String> body) {
        String userId = SecurityContextHolder.getContext().getAuthentication().getName();
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        User user = userOpt.get();
        String currentPassword = body.get("currentPassword");
        String newPassword = body.get("newPassword");
        
        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Mật khẩu hiện tại không chính xác"));
        }
        
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setUpdatedAt(new Date());
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "Đổi mật khẩu thành công"));
    }
}
