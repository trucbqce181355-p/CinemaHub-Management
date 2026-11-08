package com.example.cinemahub.controller;

import com.example.cinemahub.dto.StockUpdateRequest;
import com.example.cinemahub.model.CinemaInventory;
import com.example.cinemahub.service.InventoryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/inventory")
public class InventoryController {

    @Autowired
    private InventoryService inventoryService;

    // Lấy tồn kho theo rạp
    @GetMapping("/cinema/{cinemaId}")
    public ResponseEntity<List<CinemaInventory>> getStockByCinema(@PathVariable String cinemaId) {
        return ResponseEntity.ok(inventoryService.getStockByCinema(cinemaId));
    }

    // Cập nhật tồn kho (Manage F&B Stock per Cinema)
    @PutMapping("/stock")
    public ResponseEntity<?> updateStock(@RequestBody StockUpdateRequest req) {
        try {
            CinemaInventory saved = inventoryService.updateStock(
                    req.getCinemaId(), req.getFoodItemId(), req.getNewStock());
            return ResponseEntity.ok(saved);
        } catch (RuntimeException ex) {
            String msg = ex.getMessage() != null ? ex.getMessage() : "Cập nhật tồn kho thất bại";
            return ResponseEntity.badRequest().body(Map.of("error", msg, "message", msg));
        }
    }
}
