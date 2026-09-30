package com.example.cinemahub.service;

import com.example.cinemahub.model.ScreenRoom;
import com.example.cinemahub.repository.ScreenRoomRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class ScreenRoomService {
    @Autowired
    private ScreenRoomRepository screenRoomRepository;

    public List<ScreenRoom> getRoomsByCinema(String cinemaId) {
        return screenRoomRepository.findByCinemaId(cinemaId);
    }

    public ScreenRoom getRoomById(String roomId) {
        return screenRoomRepository.findById(roomId).orElseThrow(() -> new RuntimeException("Screen Room not found"));
    }

    public ScreenRoom createRoom(String cinemaId, ScreenRoom room) {
        room.setCinemaId(cinemaId);
        room.setStatus("Active");
        return screenRoomRepository.save(room);
    }

    public ScreenRoom updateRoom(String roomId, ScreenRoom roomDetails) {
        ScreenRoom room = getRoomById(roomId);
        room.setName(roomDetails.getName());
        room.setCapacity(roomDetails.getCapacity());
        room.setScreenType(roomDetails.getScreenType()); // UC-41
        if (roomDetails.getStatus() != null) {
            room.setStatus(roomDetails.getStatus());
        }
        return screenRoomRepository.save(room);
    }

    public ScreenRoom disableRoom(String roomId) {
        ScreenRoom room = getRoomById(roomId);
        room.setStatus("Disabled");
        return screenRoomRepository.save(room);
    }

    public void deleteRoomPermanently(String roomId) {
        screenRoomRepository.deleteById(roomId);
    }
}
