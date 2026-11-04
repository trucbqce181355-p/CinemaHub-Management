package com.example.cinemahub.controller;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.web.server.ResponseStatusException;
import java.util.Map;

@RestControllerAdvice(assignableTypes = {PromotionController.class, PricingRuleController.class})
public class PromotionErrorHandler {
    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<?> status(ResponseStatusException ex) {
        return ResponseEntity.status(ex.getStatusCode()).body(Map.of("error", ex.getReason() == null ? "Yêu cầu không hợp lệ" : ex.getReason()));
    }
    @ExceptionHandler(DuplicateKeyException.class)
    ResponseEntity<?> duplicate(DuplicateKeyException ex) {
        return ResponseEntity.status(409).body(Map.of("error", "Mã khuyến mãi đã tồn tại"));
    }
    @ExceptionHandler({IllegalArgumentException.class, MethodArgumentNotValidException.class, HttpMessageNotReadableException.class, java.time.DateTimeException.class})
    ResponseEntity<?> invalid(Exception ex) {
        return ResponseEntity.badRequest().body(Map.of("error", ex instanceof IllegalArgumentException
                ? ex.getMessage() : "Vui lòng kiểm tra các trường bắt buộc và định dạng dữ liệu"));
    }
}
