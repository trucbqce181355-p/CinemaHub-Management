package com.example.cinemahub.repository;

import com.example.cinemahub.model.Movie;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MovieRepository extends MongoRepository<Movie, String> {
    
    // Basic search by title
    @Query("{ 'title': { $regex: ?0, $options: 'i' } }")
    List<Movie> searchByTitle(String title);

    // Find by status
    List<Movie> findByStatus(String status);
}
