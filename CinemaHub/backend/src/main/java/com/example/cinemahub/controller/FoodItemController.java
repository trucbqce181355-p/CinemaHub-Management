package com.example.cinemahub.controller;

import com.example.cinemahub.dto.FoodItemRequest;
import com.example.cinemahub.model.FoodItem;
import com.example.cinemahub.service.FoodItemService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/food-beverage")
@CrossOrigin(origins = "http://localhost:5173")
@RequiredArgsConstructor
public class FoodItemController {

    private final FoodItemService foodItemService;

   
    @PostMapping
    public ResponseEntity<FoodItem> createFoodItem(@RequestBody FoodItemRequest request) {
        return ResponseEntity.ok(foodItemService.createFoodItem(request));
    }

   
    @PostMapping("/combo")
    public ResponseEntity<FoodItem> createCombo(@RequestBody FoodItemRequest request) {
        return ResponseEntity.ok(foodItemService.createCombo(request));
    }

   
    @GetMapping
    public ResponseEntity<List<FoodItem>> getActiveFoodItems() {
        return ResponseEntity.ok(foodItemService.getActiveFoodItems());
    }

    
    @GetMapping("/{id}")
    public ResponseEntity<FoodItem> getFoodItemById(@PathVariable String id) {
        return ResponseEntity.ok(foodItemService.getFoodItemById(id));
    }

  
    @PutMapping("/{id}")
    public ResponseEntity<FoodItem> updateFoodItem(@PathVariable String id, @RequestBody FoodItemRequest request) {
        return ResponseEntity.ok(foodItemService.updateFoodItem(id, request));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<FoodItem> toggleStatus(@PathVariable String id, @RequestParam(required = false) Boolean active) {
        return ResponseEntity.ok(foodItemService.toggleActiveStatus(id, active));
    }

    
    @PatchMapping("/{id}/attributes")
    public ResponseEntity<FoodItem> configureAttributes(@PathVariable String id, @RequestBody Map<String, Object> attributes) {
        return ResponseEntity.ok(foodItemService.configureAttributes(id, attributes));
    }
    @Autowired
private CinemaInventoryRepository inventoryRepo;

// View F&B khả dụng theo từng rạp chiếu
@GetMapping("/cinema/{cinemaId}")
public ResponseEntity<List<FoodItem>> getFoodsByCinema(@PathVariable String cinemaId) {
    List<FoodItem> allActiveFoods = foodItemRepository.findByActiveTrue();
    List<CinemaInventory> availableStock = inventoryRepo.findByCinemaIdAndIsAvailableTrue(cinemaId);

    // Lọc chỉ trả về các món còn tồn kho tại rạp đó
    List<String> availableFoodIds = availableStock.stream()
            .map(CinemaInventory::getFoodItemId)
            .toList();

    List<FoodItem> cinemaFoods = allActiveFoods.stream()
            .filter(food -> availableFoodIds.contains(food.getId()))
            .toList();

    return ResponseEntity.ok(cinemaFoods);
}
}