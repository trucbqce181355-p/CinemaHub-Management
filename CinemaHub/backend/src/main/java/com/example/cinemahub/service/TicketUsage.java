package com.example.cinemahub.service;

import com.example.cinemahub.model.Booking;
import com.example.cinemahub.model.Ticket;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

/** Shared rules for admission and historical booking usage. Does not mutate records. */
public final class TicketUsage {
    public enum State { UNUSED, PARTIALLY_USED, USED, INVALID }

    private TicketUsage() {}

    public static State state(Ticket ticket) {
        if (ticket == null || !("Paid".equals(ticket.getStatus()) || "Used".equals(ticket.getStatus()))
                || ticket.getSeats() == null || ticket.getSeats().isEmpty()) return State.INVALID;
        Set<String> ids = new HashSet<>();
        int used = 0;
        for (Ticket.SeatStatus seat : ticket.getSeats()) {
            if (seat == null || !same(seat.getSeatId(), seat.getSeatNumber()) || !ids.add(seat.getSeatId()))
                return State.INVALID;
            if ("Used".equals(seat.getUsageStatus())) used++;
            else if (!"Unused".equals(seat.getUsageStatus())) return State.INVALID;
        }
        if ("Used".equals(ticket.getStatus()) && used != ids.size()) return State.INVALID;
        // Some older tickets kept Paid after every seat had been consumed.
        if (used == ids.size()) return State.USED;
        return used == 0 ? State.UNUSED : State.PARTIALLY_USED;
    }

    public static State state(Booking booking, Ticket ticket) {
        return matchesBooking(booking, ticket) ? state(ticket) : State.INVALID;
    }

    public static boolean matchesBooking(Booking booking, Ticket ticket) {
        if (booking == null || ticket == null || !"CONFIRMED".equals(booking.getStatus())
                || !same(booking.getTicketId(), ticket.getId())
                || !same(booking.getBookingReference(), ticket.getBookingReference())
                || !same(booking.getShowtimeId(), ticket.getShowtimeId())
                || !same(booking.getRoomId(), ticket.getRoomId())
                || !same(booking.getCinemaId(), ticket.getCinemaId())
                || (present(ticket.getBookingId()) && !same(ticket.getBookingId(), booking.getId()))
                || booking.getSeats() == null || booking.getSeats().isEmpty()
                || state(ticket) == State.INVALID) return false;
        Map<String, String> booked = new HashMap<>();
        for (Booking.BookedSeat seat : booking.getSeats()) {
            if (seat == null || !same(seat.getSeatId(), seat.getSeatNumber())
                    || booked.put(seat.getSeatId(), seat.getSeatNumber()) != null) return false;
        }
        Map<String, String> issued = new HashMap<>();
        for (Ticket.SeatStatus seat : ticket.getSeats()) issued.put(seat.getSeatId(), seat.getSeatNumber());
        return issued.equals(booked);
    }

    private static boolean present(String value) { return value != null && !value.isBlank(); }
    private static boolean same(String first, String second) { return present(first) && first.equals(second); }
}
