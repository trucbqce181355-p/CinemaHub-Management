package com.example.cinemahub.repository;

import com.example.cinemahub.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends MongoRepository<User, String> {
    Optional<User> findByEmail(String email);
    Optional<User> findByUsername(String username);
    Optional<User> findByPhoneNumber(String phoneNumber);
    List<User> findByCustomRoleId(String customRoleId);
    long countByCustomRoleId(String customRoleId);
}
