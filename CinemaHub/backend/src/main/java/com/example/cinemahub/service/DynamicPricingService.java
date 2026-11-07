package com.example.cinemahub.service;

import com.example.cinemahub.model.*;
import com.example.cinemahub.repository.PricingRuleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.*;
import java.util.*;

@Service
@RequiredArgsConstructor
public class DynamicPricingService {
    private final PricingRuleRepository repository;
    public static final double FLOOR = 1_000, CEILING = 2_000_000;

    public static void validate(PricingRule r) {
        String trigger = Objects.toString(r.getTriggerVariable(), "");
        r.setTriggerVariable(switch (trigger) {
            case "Cuối tuần", "WEEKEND" -> "WEEKEND";
            case "Ngày Lễ", "HOLIDAY" -> "HOLIDAY";
            case "Giờ vàng", "LATE_NIGHT" -> "LATE_NIGHT";
            case "Suất chiếu sớm", "SNEAK_SHOW" -> "SNEAK_SHOW";
            default -> throw new IllegalArgumentException("Sự kiện giá không được hỗ trợ");
        });
        Double value = r.getAdjustmentValue();
        if (value == null || !Double.isFinite(value) || Math.abs(value) > 1_000_000 || value != Math.rint(value))
            throw new IllegalArgumentException("Điều chỉnh phải là số nguyên từ -1.000.000 đến 1.000.000 VND");
        if (!Set.of("Active", "Disabled").contains(Objects.toString(r.getStatus(), "")))
            throw new IllegalArgumentException("Trạng thái luật giá không hợp lệ");
        Map<String, Object> c = r.getConditionParams() == null ? Map.of() : r.getConditionParams();
        Set<String> supported = switch (r.getTriggerVariable()) {
            case "WEEKEND" -> Set.of("daysOfWeek");
            case "HOLIDAY" -> Set.of("dates");
            case "SNEAK_SHOW" -> Set.of("showtimeIds");
            case "LATE_NIGHT" -> Set.of("startHour");
            default -> Set.of();
        };
        if (!supported.containsAll(c.keySet())) throw new IllegalArgumentException("Tham số luật giá không hợp lệ");
        if (r.getTriggerVariable().equals("WEEKEND")) weekendDays(c);
        if (r.getTriggerVariable().equals("HOLIDAY")) {
            for (String date : strings(c.get("dates"))) LocalDate.parse(date);
        }
        if (r.getTriggerVariable().equals("SNEAK_SHOW")) strings(c.get("showtimeIds"));
        if (c.containsKey("startHour")) {
            double hour = PromotionRules.amount(c.get("startHour"));
            if (hour > 23 || hour != Math.floor(hour)) throw new IllegalArgumentException("Giờ bắt đầu phải từ 0 đến 23");
        }
    }
    private static List<String> strings(Object value) {
        if (!(value instanceof List<?> list) || list.isEmpty() || list.size() > 366
                || list.stream().anyMatch(v -> !(v instanceof String s) || s.isBlank() || s.length() > 128))
            throw new IllegalArgumentException("Vui lòng cung cấp danh sách ngày hoặc ID suất chiếu hợp lệ");
        return list.stream().map(Object::toString).toList();
    }
    private static List<String> weekendDays(Map<String, Object> conditions) {
        // Existing rules without a selection retain their original weekend scope.
        if (!conditions.containsKey("daysOfWeek")) return List.of("SATURDAY", "SUNDAY");
        Object value = conditions.get("daysOfWeek");
        if (!(value instanceof List<?> days) || days.isEmpty() || days.size() > 2
                || days.stream().anyMatch(day -> !Set.of("SATURDAY", "SUNDAY").contains(Objects.toString(day, "")))
                || new HashSet<>(days).size() != days.size())
            throw new IllegalArgumentException("Chọn ít nhất một ngày: Thứ Bảy hoặc Chủ nhật");
        return days.stream().map(Object::toString).toList();
    }
    public List<PricingRule> rules() { return repository.findApplicableRules(); }
    public double price(Showtime showtime, double base) { return price(showtime, base, rules()); }
    public double price(Showtime showtime, double base, List<PricingRule> rules) {
        Money.vnd(base);
        if (showtime.getStartTime() == null) throw new IllegalArgumentException("Suất chiếu thiếu thời gian bắt đầu");
        double adjustment = 0;
        for (PricingRule r : rules) {
            if (r.isArchived() || !"Active".equals(r.getStatus())) continue;
            validate(r); // Fail explicitly for invalid legacy configuration; never silently misprice.
            Map<String, Object> c = r.getConditionParams() == null ? Map.of() : r.getConditionParams();
            LocalDateTime start = showtime.getStartTime();
            boolean match = switch (r.getTriggerVariable()) {
                case "WEEKEND" -> weekendDays(c).contains(start.getDayOfWeek().name());
                case "HOLIDAY" -> strings(c.get("dates")).contains(start.toLocalDate().toString());
                case "LATE_NIGHT" -> start.getHour() >= PromotionRules.amount(c.getOrDefault("startHour", 22));
                case "SNEAK_SHOW" -> strings(c.get("showtimeIds")).contains(showtime.getId());
                default -> false;
            };
            if (match) adjustment += r.getAdjustmentValue();
        }
        return Money.vnd(Math.max(FLOOR, Math.min(CEILING, base + adjustment)));
    }
}
