package com.example.cinemahub.service;

import com.example.cinemahub.model.ScreenRoom;
import com.example.cinemahub.repository.ScreenRoomRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class ScreenRoomService {
    @Autowired
    private AdmissionCoordinator admission;

    @Autowired
    private ScreeningActivityService screeningActivity;

    @Autowired
    private ScreenRoomRepository screenRoomRepository;

    public List<ScreenRoom> getRoomsByCinema(String cinemaId) {
        return screenRoomRepository.findByCinemaId(cinemaId).stream()
                .filter(room -> !room.isDeleted())
                .toList();
    }

    public ScreenRoom getRoomById(String roomId) {
        return screenRoomRepository.findById(roomId).orElseThrow(() -> new RuntimeException("Screen Room not found"));
    }

    public ScreenRoom createRoom(String cinemaId, ScreenRoom room) {
        return admission.write(() -> createRoomInternal(cinemaId, room));
    }

    private ScreenRoom createRoomInternal(String cinemaId, ScreenRoom room) {
        room.setCinemaId(cinemaId);
        room.setStatus("Active");
        room.setDeleted(false);
        return screenRoomRepository.save(room);
    }

    public ScreenRoom updateRoom(String roomId, ScreenRoom roomDetails) {
        return admission.write(() -> updateRoomInternal(roomId, roomDetails));
    }

    private ScreenRoom updateRoomInternal(String roomId, ScreenRoom roomDetails) {
        ScreenRoom room = getRoomById(roomId);
        if (room.isDeleted()) throw new IllegalArgumentException("Phòng chiếu đã được xóa khỏi danh sách, không thể chỉnh sửa hoặc kích hoạt lại.");
        if ("Disabled".equalsIgnoreCase(roomDetails.getStatus())) {
            screeningActivity.assertRoomCanDisable(roomId);
        }
        room.setName(roomDetails.getName());
        room.setCapacity(roomDetails.getCapacity());
        room.setScreenType(roomDetails.getScreenType()); // UC-41
        if (roomDetails.getStatus() != null) {
            room.setStatus(roomDetails.getStatus());
        }
        return screenRoomRepository.save(room);
    }

    public ScreenRoom disableRoom(String roomId) {
        return admission.write(() -> disableRoomInternal(roomId));
    }

    private ScreenRoom disableRoomInternal(String roomId) {
        ScreenRoom room = getRoomById(roomId);
        screeningActivity.assertRoomCanDisable(roomId);
        room.setStatus("Disabled");
        return screenRoomRepository.save(room);
    }

    public ScreenRoom softDeleteRoom(String roomId) {
        return admission.write(() -> {
            ScreenRoom room = getRoomById(roomId);
            if (!"Disabled".equalsIgnoreCase(room.getStatus())) {
                throw new IllegalArgumentException("Vui lòng ngưng hoạt động phòng chiếu trước khi xóa.");
            }
            room.setDeleted(true);
            return screenRoomRepository.save(room);
        });
    }

}
