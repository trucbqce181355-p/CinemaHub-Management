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
    private AdmissionCoordinator admission;

    @Autowired
    private SeatRepository seatRepository;

    @Autowired
    private ScreenRoomRepository screenRoomRepository;

    @jakarta.annotation.PostConstruct
    public void migrateLegacyDefaultSeatLayouts() {
        for (ScreenRoom room : screenRoomRepository.findAll()) {
            if (room.getId() == null) continue;
            List<Seat> roomSeats = seatRepository.findByRoomId(room.getId());
            if (!isLegacyDefaultLayout(roomSeats)) continue;

            List<String> sortedRows = roomSeats.stream()
                    .map(Seat::getRow)
                    .filter(r -> r != null && !r.isBlank())
                    .distinct()
                    .sorted()
                    .toList();
            int totalRows = sortedRows.size();
            for (Seat seat : roomSeats) {
                int rowIndex = sortedRows.indexOf(seat.getRow());
                seat.setSeatType(resolveDefaultSeatType(rowIndex, totalRows));
            }
            seatRepository.saveAll(roomSeats);
        }
    }

    private boolean isLegacyDefaultLayout(List<Seat> seats) {
        if (seats == null || seats.isEmpty()) return false;
        List<String> sortedRows = seats.stream()
                .map(Seat::getRow)
                .filter(r -> r != null && !r.isBlank())
                .distinct()
                .sorted()
                .toList();
        if (sortedRows.size() < 2) return false;

        boolean hasDifference = false;
        for (Seat seat : seats) {
            if (!"ACTIVE".equalsIgnoreCase(seat.getStatus())) {
                return false;
            }
            String row = seat.getRow();
            String legacyType;
            if ("F".equalsIgnoreCase(row) || "G".equalsIgnoreCase(row)) {
                legacyType = "COUPLE";
            } else if ("C".equalsIgnoreCase(row) || "D".equalsIgnoreCase(row) || "E".equalsIgnoreCase(row)) {
                legacyType = "VIP";
            } else {
                legacyType = "STANDARD";
            }
            if (!legacyType.equalsIgnoreCase(seat.getSeatType())) {
                return false;
            }
            String expectedNewType = resolveDefaultSeatType(sortedRows.indexOf(row), sortedRows.size());
            if (!expectedNewType.equalsIgnoreCase(seat.getSeatType())) {
                hasDifference = true;
            }
        }
        return hasDifference;
    }

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
        return admission.write(() -> generateDefaultSeatsInternal(roomId, rowsCount, colsCount));
    }

    static String resolveDefaultSeatType(int rowIndex, int totalRows) {
        if (rowIndex >= totalRows - 2) {
            return "COUPLE";
        }
        int remainingRows = Math.max(0, totalRows - 2);
        int standardRows = remainingRows / 2;
        return rowIndex < standardRows ? "STANDARD" : "VIP";
    }

    private List<Seat> generateDefaultSeatsInternal(String roomId, int rowsCount, int colsCount) {
        seatRepository.deleteByRoomId(roomId); // Xóa ghế cũ

        String[] rowLabels = {"A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O"};
        int totalRows = Math.min(Math.max(rowsCount, 0), rowLabels.length);
        List<Seat> seats = new ArrayList<>();

        for (int r = 0; r < totalRows; r++) {
            String row = rowLabels[r];
            String seatType = resolveDefaultSeatType(r, totalRows);
            for (int col = 1; col <= colsCount; col++) {
                Seat seat = new Seat();
                seat.setRoomId(roomId);
                seat.setRow(row);
                seat.setCol(col);
                seat.setSeatNumber(row + col);
                seat.setSeatType(seatType);
                seat.setStatus("ACTIVE");
                seats.add(seat);
            }
        }
        List<Seat> savedSeats = seatRepository.saveAll(seats);
        updateRoomCapacity(roomId, savedSeats);
        return savedSeats;
    }

    public List<Seat> saveSeats(String roomId, List<Seat> seats) {
        return admission.write(() -> saveSeatsInternal(roomId, seats));
    }

    private List<Seat> saveSeatsInternal(String roomId, List<Seat> seats) {
        seatRepository.deleteByRoomId(roomId);
        for (Seat s : seats) {
            s.setRoomId(roomId);
        }
        List<Seat> savedSeats = seatRepository.saveAll(seats);
        updateRoomCapacity(roomId, savedSeats);
        return savedSeats;
    }
}
