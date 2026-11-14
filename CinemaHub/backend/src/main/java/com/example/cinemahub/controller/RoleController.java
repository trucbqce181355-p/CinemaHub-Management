package com.example.cinemahub.controller;

import com.example.cinemahub.model.Role;
import com.example.cinemahub.model.User;
import com.example.cinemahub.repository.RoleRepository;
import com.example.cinemahub.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/roles")
public class RoleController {

    private static final List<String> SYSTEM_ROLE_NAMES = List.of("Customer", "Staff", "Manager", "Admin");
    private static final Set<String> VALID_PERMISSIONS = Set.of(
            "manage_movies",
            "manage_showtimes",
            "manage_bookings",
            "manage_users",
            "view_reports"
    );

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private UserRepository userRepository;

    private synchronized void ensureSystemRolesSeeded() {
        Map<String, List<String>> defaultPermissions = Map.of(
                "Customer", List.of(),
                "Staff", List.of("manage_bookings"),
                "Manager", List.of("manage_movies", "manage_showtimes", "manage_bookings", "view_reports"),
                "Admin", List.of("manage_movies", "manage_showtimes", "manage_bookings", "manage_users", "view_reports")
        );
        Map<String, String> defaultDescriptions = Map.of(
                "Customer", "Khách hàng đặt vé và sử dụng dịch vụ rạp",
                "Staff", "Nhân viên quầy vé và soát vé tại rạp",
                "Manager", "Quản lý vận hành phim, suất chiếu, tin tức và khuyến mãi",
                "Admin", "Quản trị hệ thống, tài khoản và phân quyền"
        );

        for (String roleName : SYSTEM_ROLE_NAMES) {
            if (roleRepository.findByNameIgnoreCase(roleName).isEmpty()) {
                Role systemRole = new Role();
                systemRole.setName(roleName);
                systemRole.setDescription(defaultDescriptions.getOrDefault(roleName, ""));
                systemRole.setPermissions(new ArrayList<>(defaultPermissions.getOrDefault(roleName, List.of())));
                systemRole.setIsSystem(true);
                systemRole.setCreatedAt(new Date());
                systemRole.setUpdatedAt(new Date());
                roleRepository.save(systemRole);
            }
        }
    }

    private List<String> sanitizePermissions(List<String> rawPermissions) {
        if (rawPermissions == null) {
            return new ArrayList<>();
        }
        LinkedHashSet<String> cleaned = new LinkedHashSet<>();
        for (String p : rawPermissions) {
            if (p != null && VALID_PERMISSIONS.contains(p)) {
                cleaned.add(p);
            }
        }
        return new ArrayList<>(cleaned);
    }

    @GetMapping
    @PreAuthorize("hasAuthority('manage_users') or hasRole('Admin')")
    public ResponseEntity<List<Role>> getAllRoles() {
        ensureSystemRolesSeeded();
        List<Role> roles = roleRepository.findAll();
        roles.sort(Comparator
                .comparing((Role r) -> !Boolean.TRUE.equals(r.getIsSystem()))
                .thenComparing(r -> r.getCreatedAt() != null ? r.getCreatedAt() : new Date(0)));
        return ResponseEntity.ok(roles);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('manage_users') or hasRole('Admin')")
    public ResponseEntity<?> createRole(@RequestBody Role request) {
        ensureSystemRolesSeeded();

        String name = request.getName() != null ? request.getName().trim() : "";
        if (name.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Tên vai trò không được để trống"));
        }
        if (roleRepository.existsByNameIgnoreCase(name)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Tên vai trò đã tồn tại"));
        }

        Role role = new Role();
        role.setName(name);
        role.setDescription(request.getDescription() != null ? request.getDescription().trim() : "");
        role.setPermissions(sanitizePermissions(request.getPermissions()));
        role.setIsSystem(false);
        role.setCreatedAt(new Date());
        role.setUpdatedAt(new Date());

        return ResponseEntity.status(201).body(roleRepository.save(role));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('manage_users') or hasRole('Admin')")
    public ResponseEntity<?> updateRole(@PathVariable String id, @RequestBody Role request) {
        Optional<Role> roleOpt = roleRepository.findById(id);
        if (roleOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Role existing = roleOpt.get();
        if (Boolean.TRUE.equals(existing.getIsSystem())) {
            return ResponseEntity.status(403).body(Map.of("message", "Không thể chỉnh sửa vai trò mặc định của hệ thống"));
        }

        String name = request.getName() != null ? request.getName().trim() : existing.getName();
        if (name.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Tên vai trò không được để trống"));
        }
        if (!name.equalsIgnoreCase(existing.getName()) && roleRepository.existsByNameIgnoreCase(name)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Tên vai trò đã tồn tại"));
        }

        existing.setName(name);
        if (request.getDescription() != null) {
            existing.setDescription(request.getDescription().trim());
        }
        if (request.getPermissions() != null) {
            existing.setPermissions(sanitizePermissions(request.getPermissions()));
        }
        existing.setUpdatedAt(new Date());
        Role saved = roleRepository.save(existing);

        List<User> assignedUsers = userRepository.findByCustomRoleId(saved.getId());
        for (User u : assignedUsers) {
            u.setRole(saved.getName());
            u.setPermissions(new ArrayList<>(saved.getPermissions()));
            u.setUpdatedAt(new Date());
            userRepository.save(u);
        }

        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('manage_users') or hasRole('Admin')")
    public ResponseEntity<?> deleteRole(@PathVariable String id) {
        Optional<Role> roleOpt = roleRepository.findById(id);
        if (roleOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Role existing = roleOpt.get();
        if (Boolean.TRUE.equals(existing.getIsSystem())) {
            return ResponseEntity.status(403).body(Map.of("message", "Không thể xóa vai trò mặc định của hệ thống"));
        }
        if (userRepository.countByCustomRoleId(id) > 0) {
            return ResponseEntity.badRequest().body(Map.of("message", "Không thể xóa vai trò đang được gán cho người dùng"));
        }
        roleRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Xóa vai trò thành công"));
    }
}
