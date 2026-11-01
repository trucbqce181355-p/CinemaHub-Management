package com.example.cinemahub.service;

import java.math.BigDecimal;
import java.math.RoundingMode;

/** All persisted prices are whole VND. Round once at each price/discount boundary. */
public final class Money {
    private Money() {}
    public static double vnd(double amount) {
        if (!Double.isFinite(amount) || amount < 0 || amount > 1_000_000_000d)
            throw new IllegalArgumentException("Số tiền không hợp lệ");
        return BigDecimal.valueOf(amount).setScale(0, RoundingMode.HALF_UP).doubleValue();
    }
}
