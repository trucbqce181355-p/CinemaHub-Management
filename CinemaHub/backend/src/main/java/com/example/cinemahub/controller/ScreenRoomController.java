package com.example.cinemahub.controller;

import com.example.cinemahub.model.ScreenRoom;
import com.example.cinemahub.service.ScreenRoomService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/cinemas/{cinemaId}/rooms")
@CrossOrigin(origins = "*")
public class ScreenRoomController {
    @Autowired
    private ScreenRoomService screenRoomService;

    // UC-38: View Screen Room List
    @GetMapping
    public ResponseEntity<List<ScreenRoom>> getRooms(@PathVariable String cinemaId) {
        return ResponseEntity.ok(screenRoomService.getRoomsByCinema(cinemaId));
    }

    @GetMapping("/{roomId}")
    public ResponseEntity<ScreenRoom> getRoomById(@PathVariable String cinemaId, @PathVariable String roomId) {
        return ResponseEntity.ok(screenRoomService.getRoomById(roomId));
    }

    // UC-37: Add New Screen Room
    @PostMapping
    public ResponseEntity<ScreenRoom> createRoom(@PathVariable String cinemaId, @RequestBody ScreenRoom room) {
        return ResponseEntity.ok(screenRoomService.createRoom(cinemaId, room));
    }

    // UC-39 & UC-41: Edit Screen Room / Configure Screen Type
    @PutMapping("/{roomId}")
    public ResponseEntity<ScreenRoom> updateRoom(@PathVariable String cinemaId, @PathVariable String roomId, @RequestBody ScreenRoom room) {
        return ResponseEntity.ok(screenRoomService.updateRoom(roomId, room));
    }

    // UC-40: Delete/Disable Screen Room
    @DeleteMapping("/{roomId}")
    public ResponseEntity<ScreenRoom> disableRoom(@PathVariable String cinemaId, @PathVariable String roomId) {
        return ResponseEntity.ok(screenRoomService.disableRoom(roomId));
    }

    // Delete Permanently
    @DeleteMapping("/{roomId}/permanent")
    public ResponseEntity<Void> deleteRoomPermanently(@PathVariable String cinemaId, @PathVariable String roomId) {
        screenRoomService.deleteRoomPermanently(roomId);
        return ResponseEntity.ok().build();
    }
}
