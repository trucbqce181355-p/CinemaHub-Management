package com.example.cinemahub.service;

import com.example.cinemahub.model.Seat;
import com.example.cinemahub.model.ScreenRoom;
import com.example.cinemahub.repository.SeatRepository;
import com.example.cinemahub.repository.ScreenRoomRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class SeatService {
    @Autowired
    private SeatRepository seatRepository;

    @Autowired
    private ScreenRoomRepository screenRoomRepository;

    public List<Seat> getSeatsByRoomId(String roomId) {
        return seatRepository.findByRoomId(roomId);
    }

    private void updateRoomCapacity(String roomId, List<Seat> seats) {
        long capacity = seats.stream().filter(s -> "ACTIVE".equals(s.getStatus())).count();
        screenRoomRepository.findById(roomId).ifPresent(room -> {
            room.setCapacity((int) capacity);
            screenRoomRepository.save(room);
        });
    }

    public List<Seat> generateDefaultSeats(String roomId, int rowsCount, int colsCount) {
        seatRepository.deleteByRoomId(roomId); // Xóa ghế cũ

        String[] rowLabels = {"A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O"};
        List<Seat> seats = new ArrayList<>();

        for (int r = 0; r < rowsCount && r < rowLabels.length; r++) {
            String row = rowLabels[r];
            for (int col = 1; col <= colsCount; col++) {
                Seat seat = new Seat();
                seat.setRoomId(roomId);
                seat.setRow(row);
                seat.setCol(col);
                seat.setSeatNumber(row + col);
                
                // Mặc định phân loại
                if ("F".equalsIgnoreCase(row) || "G".equalsIgnoreCase(row)) {
                    seat.setSeatType("COUPLE");
                } else if ("C".equalsIgnoreCase(row) || "D".equalsIgnoreCase(row) || "E".equalsIgnoreCase(row)) {
                    seat.setSeatType("VIP");
                } else {
                    seat.setSeatType("STANDARD");
                }
                
                seat.setStatus("ACTIVE");
                seats.add(seat);
            }
        }
        List<Seat> savedSeats = seatRepository.saveAll(seats);
        updateRoomCapacity(roomId, savedSeats);
        return savedSeats;
    }

    public List<Seat> saveSeats(String roomId, List<Seat> seats) {
        seatRepository.deleteByRoomId(roomId);
        for (Seat s : seats) {
            s.setRoomId(roomId);
        }
        List<Seat> savedSeats = seatRepository.saveAll(seats);
        updateRoomCapacity(roomId, savedSeats);
        return savedSeats;
    }
}
