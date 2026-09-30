package com.example.cinemahub.controller;

import com.example.cinemahub.model.Movie;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class TestController {

    @Autowired
    private MongoTemplate mongoTemplate;

    @GetMapping("/api/test-db")
    public String testDb() {
        long count = mongoTemplate.getCollection("movies").countDocuments();
        List<Movie> movies = mongoTemplate.findAll(Movie.class);
        return "Collection count: " + count + ", Mapped count: " + movies.size();
    }
}
