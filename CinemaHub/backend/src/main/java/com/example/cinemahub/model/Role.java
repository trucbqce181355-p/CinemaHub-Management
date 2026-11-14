package com.example.cinemahub.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;

@Data
@Document(collection = "roles")
public class Role {
    @Id
    private String id;
    private String name;
    private String description = "";
    private List<String> permissions = new ArrayList<>();
    private Boolean isSystem = false;
    private Date createdAt = new Date();
    private Date updatedAt = new Date();
}
