package com.example.cinemahub.service;

import com.example.cinemahub.dto.SelectFoodBookingRequest;
import com.example.cinemahub.model.Booking;
import com.example.cinemahub.model.CinemaInventory;
import com.example.cinemahub.model.FoodItem;
import com.example.cinemahub.repository.CinemaInventoryRepository;
import com.example.cinemahub.repository.FoodItemRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class InventoryService {

    public static final int DEFAULT_INITIAL_STOCK = 50;

    @Autowired
    private CinemaInventoryRepository inventoryRepo;

    @Autowired
    private FoodItemRepository foodItemRepo;

    /**
     * Khởi tạo tồn kho mặc định (50) cho các món chưa từng có bản ghi tồn kho tại rạp,
     * đồng thời đồng bộ trạng thái khả dụng (isAvailable) cho các gói Combo dựa trên tồn kho món thành phần.
     */
    public synchronized List<CinemaInventory> ensureCinemaInventoryInitialized(String cinemaId) {
        if (cinemaId == null || cinemaId.isBlank()) {
            return List.of();
        }

        List<FoodItem> allFoods = foodItemRepo.findAll();
        List<CinemaInventory> existing = inventoryRepo.findByCinemaId(cinemaId);

        Map<String, CinemaInventory> invMap = new LinkedHashMap<>();
        for (CinemaInventory inv : existing) {
            if (inv.getFoodItemId() != null && !invMap.containsKey(inv.getFoodItemId())) {
                invMap.put(inv.getFoodItemId(), inv);
            }
        }

        // 1. Khởi tạo tồn kho mặc định cho các món lẻ chưa có bản ghi
        for (FoodItem food : allFoods) {
            if (Boolean.TRUE.equals(food.getIsCombo())) continue;
            if (!invMap.containsKey(food.getId())) {
                CinemaInventory created = inventoryRepo.save(
                        new CinemaInventory(cinemaId, food.getId(), DEFAULT_INITIAL_STOCK));
                invMap.put(food.getId(), created);
            }
        }

        // 2. Khởi tạo & đồng bộ trạng thái khả dụng cho các gói Combo
        for (FoodItem food : allFoods) {
            if (!Boolean.TRUE.equals(food.getIsCombo())) continue;
            CinemaInventory comboInv = invMap.get(food.getId());
            boolean isNew = false;
            if (comboInv == null) {
                comboInv = new CinemaInventory(cinemaId, food.getId(), DEFAULT_INITIAL_STOCK);
                isNew = true;
            }
            boolean shouldBeAvailable = evaluateComboAvailability(food, comboInv, invMap);
            if (isNew || !Objects.equals(comboInv.getIsAvailable(), shouldBeAvailable)) {
                comboInv.setIsAvailable(shouldBeAvailable);
                comboInv = inventoryRepo.save(comboInv);
            }
            invMap.put(food.getId(), comboInv);
        }

        return new ArrayList<>(invMap.values());
    }

    // Quản lý kho theo rạp
    public List<CinemaInventory> getStockByCinema(String cinemaId) {
        return ensureCinemaInventoryInitialized(cinemaId);
    }

    // Danh sách F&B đang bán và còn hàng tại rạp
    public List<FoodItem> getAvailableFoodsByCinema(String cinemaId) {
        List<CinemaInventory> inventories = ensureCinemaInventoryInitialized(cinemaId);
        Set<String> availableFoodIds = new HashSet<>();
        for (CinemaInventory inv : inventories) {
            if (Boolean.TRUE.equals(inv.getIsAvailable())
                    && inv.getStockQuantity() != null
                    && inv.getStockQuantity() > 0) {
                availableFoodIds.add(inv.getFoodItemId());
            }
        }

        return foodItemRepo.findByActiveTrue().stream()
                .filter(food -> availableFoodIds.contains(food.getId()))
                .toList();
    }

    // Cập nhật số lượng tồn kho theo rạp
    public synchronized CinemaInventory updateStock(String cinemaId, String foodItemId, Integer newStockValue) {
        if (cinemaId == null || cinemaId.isBlank() || foodItemId == null || foodItemId.isBlank()) {
            throw new IllegalArgumentException("Thiếu thông tin rạp hoặc món F&B!");
        }
        int newStock = newStockValue != null ? newStockValue : 0;
        if (newStock < 0) {
            throw new IllegalArgumentException("Số lượng tồn kho không được âm!");
        }

        ensureCinemaInventoryInitialized(cinemaId);

        CinemaInventory inv = inventoryRepo.findByCinemaIdAndFoodItemId(cinemaId, foodItemId)
                .orElse(new CinemaInventory(cinemaId, foodItemId, newStock));
        inv.setStockQuantity(newStock);

        Optional<FoodItem> foodOpt = foodItemRepo.findById(foodItemId);
        if (foodOpt.isPresent() && Boolean.TRUE.equals(foodOpt.get().getIsCombo())) {
            Map<String, CinemaInventory> invMap = mapByFoodId(inventoryRepo.findByCinemaId(cinemaId));
            invMap.put(foodItemId, inv);
            inv.setIsAvailable(evaluateComboAvailability(foodOpt.get(), inv, invMap));
        }

        CinemaInventory saved = inventoryRepo.save(inv);
        refreshAllCombosForCinema(cinemaId);
        return inventoryRepo.findByCinemaIdAndFoodItemId(cinemaId, foodItemId).orElse(saved);
    }

    // Tự động vô hiệu hóa món & combo khi hết hàng sau giao dịch đơn lẻ
    public synchronized boolean deductStockAndAutoDisable(String cinemaId, String foodItemId, int quantity) {
        if (quantity <= 0) {
            return true;
        }
        try {
            SelectFoodBookingRequest.SelectedFoodItem item =
                    new SelectFoodBookingRequest.SelectedFoodItem(foodItemId, null, null, quantity);
            deductBookingFoods(cinemaId, List.of(item));
            return true;
        } catch (RuntimeException ex) {
            return false;
        }
    }

    /**
     * Kiểm tra và trừ tồn kho nguyên tử cho toàn bộ danh sách bắp nước/combo của đơn đặt vé.
     * Tự động vô hiệu hóa món lẻ và các gói Combo liên quan ngay khi chạm mốc hết hàng.
     */
    public synchronized List<Booking.BookedFoodItem> deductBookingFoods(
            String cinemaId,
            List<SelectFoodBookingRequest.SelectedFoodItem> requestedItems) {
        if (requestedItems == null || requestedItems.isEmpty()) {
            return new ArrayList<>();
        }
        if (cinemaId == null || cinemaId.isBlank()) {
            throw new IllegalArgumentException("Không xác định được rạp để kiểm tra tồn kho bắp nước");
        }

        Map<String, Integer> aggregatedQty = new LinkedHashMap<>();
        for (SelectFoodBookingRequest.SelectedFoodItem reqItem : requestedItems) {
            if (reqItem == null || reqItem.getFoodItemId() == null || reqItem.getFoodItemId().isBlank()) {
                continue;
            }
            int qty = reqItem.getQuantity() != null ? reqItem.getQuantity() : 0;
            if (qty <= 0) continue;
            if (qty > 99) {
                throw new IllegalArgumentException("Số lượng mỗi món bắp nước không vượt quá 99");
            }
            aggregatedQty.merge(reqItem.getFoodItemId().trim(), qty, Integer::sum);
        }

        if (aggregatedQty.isEmpty()) {
            return new ArrayList<>();
        }

        ensureCinemaInventoryInitialized(cinemaId);
        Map<String, CinemaInventory> invMap = mapByFoodId(inventoryRepo.findByCinemaId(cinemaId));
        Map<String, FoodItem> foodMap = new HashMap<>();
        for (FoodItem f : foodItemRepo.findAll()) {
            foodMap.put(f.getId(), f);
        }

        Map<String, Integer> totalDeductions = new LinkedHashMap<>();
        List<Booking.BookedFoodItem> bookedFoods = new ArrayList<>();

        for (Map.Entry<String, Integer> entry : aggregatedQty.entrySet()) {
            String foodId = entry.getKey();
            int qty = entry.getValue();

            FoodItem food = foodMap.get(foodId);
            if (food == null || !Boolean.TRUE.equals(food.getActive())) {
                throw new IllegalArgumentException("Món bắp nước đã ngừng phục vụ hoặc không tồn tại");
            }

            CinemaInventory inv = invMap.get(foodId);
            if (inv == null || !Boolean.TRUE.equals(inv.getIsAvailable())) {
                throw new IllegalArgumentException("Món \"" + food.getName() + "\" hiện đã hết hàng tại rạp này!");
            }

            totalDeductions.merge(foodId, qty, Integer::sum);

            if (Boolean.TRUE.equals(food.getIsCombo()) && food.getComboItems() != null) {
                for (FoodItem.ComboItemDetail ci : food.getComboItems()) {
                    if (ci != null && ci.getFoodItemId() != null
                            && foodMap.containsKey(ci.getFoodItemId())
                            && invMap.containsKey(ci.getFoodItemId())) {
                        int compNeed = Math.max(1, ci.getQuantity() != null ? ci.getQuantity() : 1) * qty;
                        totalDeductions.merge(ci.getFoodItemId(), compNeed, Integer::sum);
                    }
                }
            }

            double unitPrice = Money.vnd(food.getBasePrice() != null ? food.getBasePrice() : 0.0);
            bookedFoods.add(Booking.BookedFoodItem.builder()
                    .foodItemId(foodId)
                    .name(food.getName())
                    .price(unitPrice)
                    .quantity(qty)
                    .build());
        }

        // Kiểm tra tồn kho của toàn bộ món/thành phần trước khi ghi DB
        for (Map.Entry<String, Integer> deduct : totalDeductions.entrySet()) {
            String targetFoodId = deduct.getKey();
            int needed = deduct.getValue();
            CinemaInventory inv = invMap.get(targetFoodId);
            int available = (inv != null && inv.getStockQuantity() != null) ? inv.getStockQuantity() : 0;
            if (available < needed) {
                String name = foodMap.containsKey(targetFoodId) ? foodMap.get(targetFoodId).getName() : targetFoodId;
                throw new IllegalArgumentException(
                        "Món \"" + name + "\" tại rạp chỉ còn " + available + " phần, không đủ cho đơn đặt vé!");
            }
        }

        // Thực hiện trừ kho và cập nhật trạng thái khả dụng
        for (Map.Entry<String, Integer> deduct : totalDeductions.entrySet()) {
            CinemaInventory inv = invMap.get(deduct.getKey());
            int remaining = Math.max(0, inv.getStockQuantity() - deduct.getValue());
            inv.setStockQuantity(remaining);
            if (remaining <= 0) {
                inv.setIsAvailable(false);
            }
            inventoryRepo.save(inv);
        }

        refreshAllCombosForCinema(cinemaId);
        return bookedFoods;
    }

    /**
     * Hoàn lại tồn kho bắp nước khi đơn tạm giữ hết hạn, thanh toán thất bại hoặc hủy đơn.
     */
    public synchronized void restoreBookingFoods(Booking booking) {
        if (booking == null) return;
        restoreBookingFoods(booking.getCinemaId(), booking.getFoodItems());
    }

    public synchronized void restoreBookingFoods(String cinemaId, List<Booking.BookedFoodItem> foodItems) {
        if (cinemaId == null || cinemaId.isBlank() || foodItems == null || foodItems.isEmpty()) {
            return;
        }

        Map<String, CinemaInventory> invMap = mapByFoodId(inventoryRepo.findByCinemaId(cinemaId));
        Map<String, FoodItem> foodMap = new HashMap<>();
        for (FoodItem f : foodItemRepo.findAll()) {
            foodMap.put(f.getId(), f);
        }

        Map<String, Integer> restorations = new LinkedHashMap<>();
        for (Booking.BookedFoodItem item : foodItems) {
            if (item == null || item.getFoodItemId() == null || item.getQuantity() == null || item.getQuantity() <= 0) {
                continue;
            }
            String foodId = item.getFoodItemId();
            int qty = item.getQuantity();
            restorations.merge(foodId, qty, Integer::sum);

            FoodItem food = foodMap.get(foodId);
            if (food != null && Boolean.TRUE.equals(food.getIsCombo()) && food.getComboItems() != null) {
                for (FoodItem.ComboItemDetail ci : food.getComboItems()) {
                    if (ci != null && ci.getFoodItemId() != null && foodMap.containsKey(ci.getFoodItemId())) {
                        int compQty = Math.max(1, ci.getQuantity() != null ? ci.getQuantity() : 1) * qty;
                        restorations.merge(ci.getFoodItemId(), compQty, Integer::sum);
                    }
                }
            }
        }

        for (Map.Entry<String, Integer> entry : restorations.entrySet()) {
            String targetFoodId = entry.getKey();
            int addQty = entry.getValue();
            CinemaInventory inv = invMap.get(targetFoodId);
            if (inv == null) {
                inv = new CinemaInventory(cinemaId, targetFoodId, addQty);
            } else {
                int current = inv.getStockQuantity() != null ? inv.getStockQuantity() : 0;
                inv.setStockQuantity(current + addQty);
            }
            inventoryRepo.save(inv);
        }

        refreshAllCombosForCinema(cinemaId);
    }

    private void refreshAllCombosForCinema(String cinemaId) {
        List<FoodItem> allCombos = foodItemRepo.findAll().stream()
                .filter(f -> Boolean.TRUE.equals(f.getIsCombo()))
                .toList();
        if (allCombos.isEmpty()) return;

        Map<String, CinemaInventory> invMap = mapByFoodId(inventoryRepo.findByCinemaId(cinemaId));
        for (FoodItem combo : allCombos) {
            CinemaInventory comboInv = invMap.get(combo.getId());
            if (comboInv == null) {
                comboInv = new CinemaInventory(cinemaId, combo.getId(), DEFAULT_INITIAL_STOCK);
            }
            boolean shouldBeAvailable = evaluateComboAvailability(combo, comboInv, invMap);
            if (comboInv.getId() == null || !Objects.equals(comboInv.getIsAvailable(), shouldBeAvailable)) {
                comboInv.setIsAvailable(shouldBeAvailable);
                comboInv = inventoryRepo.save(comboInv);
                invMap.put(combo.getId(), comboInv);
            }
        }
    }

    private boolean evaluateComboAvailability(
            FoodItem combo,
            CinemaInventory comboInv,
            Map<String, CinemaInventory> invMap) {
        if (comboInv == null || comboInv.getStockQuantity() == null || comboInv.getStockQuantity() <= 0) {
            return false;
        }
        if (combo.getComboItems() != null) {
            for (FoodItem.ComboItemDetail ci : combo.getComboItems()) {
                if (ci == null || ci.getFoodItemId() == null) continue;
                CinemaInventory partInv = invMap.get(ci.getFoodItemId());
                int requiredQty = Math.max(1, ci.getQuantity() != null ? ci.getQuantity() : 1);
                if (partInv == null
                        || !Boolean.TRUE.equals(partInv.getIsAvailable())
                        || partInv.getStockQuantity() == null
                        || partInv.getStockQuantity() < requiredQty) {
                    return false;
                }
            }
        }
        return true;
    }

    private Map<String, CinemaInventory> mapByFoodId(List<CinemaInventory> list) {
        Map<String, CinemaInventory> map = new LinkedHashMap<>();
        for (CinemaInventory inv : list) {
            if (inv.getFoodItemId() != null && !map.containsKey(inv.getFoodItemId())) {
                map.put(inv.getFoodItemId(), inv);
            }
        }
        return map;
    }
}
