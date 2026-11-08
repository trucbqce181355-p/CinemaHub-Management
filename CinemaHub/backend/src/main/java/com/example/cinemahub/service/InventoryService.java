package com.example.cinemahub.service;

import com.example.cinemahub.model.CinemaInventory;
import com.example.cinemahub.model.FoodItem;
import com.example.cinemahub.repository.CinemaInventoryRepository;
import com.example.cinemahub.repository.FoodItemRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class InventoryService {

    @Autowired
    private CinemaInventoryRepository inventoryRepo;

    @Autowired
    private FoodItemRepository foodItemRepo;

    // Quản lý kho theo rạp
    public List<CinemaInventory> getStockByCinema(String cinemaId) {
        return inventoryRepo.findByCinemaId(cinemaId);
    }

    // Cập nhật số lượng tồn kho theo rạp
    public CinemaInventory updateStock(String cinemaId, String foodItemId, int newStock) {
        if (newStock < 0) {
            throw new IllegalArgumentException("Số lượng tồn kho không được âm!");
        }

        CinemaInventory inv = inventoryRepo.findByCinemaIdAndFoodItemId(cinemaId, foodItemId)
                .orElse(new CinemaInventory(cinemaId, foodItemId, newStock));

        inv.setStockQuantity(newStock);
        CinemaInventory saved = inventoryRepo.save(inv);

        // Kích hoạt hoặc tự động tắt combo liên quan
        handleComboAvailability(cinemaId, foodItemId, inv.getIsAvailable());
        return saved;
    }

    // Tự động vô hiệu hóa món & combo khi hết hàng sau giao dịch
    @Transactional
    public synchronized boolean deductStockAndAutoDisable(String cinemaId, String foodItemId, int quantity) {
        CinemaInventory inv = inventoryRepo.findByCinemaIdAndFoodItemId(cinemaId, foodItemId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy dữ liệu tồn kho của món tại rạp!"));

        if (inv.getStockQuantity() < quantity) {
            return false; // Không đủ tồn kho
        }

        inv.setStockQuantity(inv.getStockQuantity() - quantity);
        inventoryRepo.save(inv);

        // Kiểm tra nếu hết hàng (Auto-disable)
        if (inv.getStockQuantity() <= 0) {
            inv.setIsAvailable(false);
            inventoryRepo.save(inv);
            handleComboAvailability(cinemaId, foodItemId, false);
        }
        return true;
    }

    private void handleComboAvailability(String cinemaId, String singleFoodItemId, boolean isItemAvailable) {
        List<FoodItem> combos = foodItemRepo.findByComboItemsFoodItemId(singleFoodItemId);
        for (FoodItem combo : combos) {
            Optional<CinemaInventory> comboInvOpt = inventoryRepo.findByCinemaIdAndFoodItemId(cinemaId, combo.getId());
            CinemaInventory comboInv = comboInvOpt.orElse(new CinemaInventory(cinemaId, combo.getId(), 100));

            if (!isItemAvailable) {
                // Nếu 1 món con hết hàng -> Combo tự động tạm ngưng bán tại rạp đó
                comboInv.setIsAvailable(false);
            } else {
                // Kiểm tra xem tất cả các món con khác của combo có còn hàng không
                boolean allComponentsAvailable = true;
                if (combo.getComboItems() != null) {
                    for (FoodItem.ComboItemDetail ci : combo.getComboItems()) {
                        Optional<CinemaInventory> partInv = inventoryRepo.findByCinemaIdAndFoodItemId(cinemaId, ci.getFoodItemId());
                        if (partInv.isEmpty() || !partInv.get().getIsAvailable() || partInv.get().getStockQuantity() <= 0) {
                            allComponentsAvailable = false;
                            break;
                        }
                    }
                }
                comboInv.setIsAvailable(allComponentsAvailable);
            }
            inventoryRepo.save(comboInv);
        }
    }
}