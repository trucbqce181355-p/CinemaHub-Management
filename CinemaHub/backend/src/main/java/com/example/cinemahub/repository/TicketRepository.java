package com.example.cinemahub.repository;

import com.example.cinemahub.model.Ticket;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TicketRepository extends MongoRepository<Ticket, String> {
    Optional<Ticket> findByBookingReference(String bookingReference);
    Optional<Ticket> findByBookingId(String bookingId);
    List<Ticket> findByShowtimeId(String showtimeId);
}
