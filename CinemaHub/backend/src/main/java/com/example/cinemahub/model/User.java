package com.example.cinemahub.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.Date;
import java.util.List;
import java.util.ArrayList;

@Data
@Document(collection = "users")
public class User {
    @Id
    private String id;
    private String username;
    private String email;
    private String password;
    private String phoneNumber = "";
    private Date dateOfBirth;
    private String role = "Customer"; // Customer, Staff, Admin
    private String status = "Active"; // Active, Locked
    private Boolean isVerified = false;
    private String resetPasswordToken;
    private Date resetPasswordExpire;
    private String otp;
    private Date otpExpires;
    private List<String> permissions = new ArrayList<>();
    private Date createdAt = new Date();
    private Date updatedAt = new Date();
}
