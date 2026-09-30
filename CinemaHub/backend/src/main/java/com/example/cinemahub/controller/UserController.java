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

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

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
        userRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "User deleted successfully"));
    }
}
