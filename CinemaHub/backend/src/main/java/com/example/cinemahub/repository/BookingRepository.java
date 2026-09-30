package com.example.cinemahub.repository;

import com.example.cinemahub.model.Booking;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BookingRepository extends MongoRepository<Booking, String> {
    Optional<Booking> findByBookingReference(String bookingReference);
    List<Booking> findByShowtimeId(String showtimeId);
    List<Booking> findByShowtimeIdAndStatusIn(String showtimeId, List<String> statuses);
    List<Booking> findByUserIdOrderByCreatedAtDesc(String userId);
    List<Booking> findByCustomerEmailOrderByCreatedAtDesc(String customerEmail);
    List<Booking> findByCustomerPhoneOrderByCreatedAtDesc(String customerPhone);
    List<Booking> findAllByOrderByCreatedAtDesc();
}
