package com.example.cinemahub.service;

import com.example.cinemahub.config.VnpayConfig;
import com.example.cinemahub.model.Payment;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class VnPayService {
    private final VnpayConfig config;
    @Value("${vnpay.enabled:false}")
    private boolean enabled;

    public boolean isConfigured() {
        return enabled && config.getTmnCode() != null && !config.getTmnCode().isBlank()
                && config.getHashSecret() != null && !config.getHashSecret().isBlank();
    }

    public void requireConfigured() {
        if (!isConfigured()) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                "Chưa cấu hình tài khoản VNPay. Chưa tạo giao dịch; vui lòng liên hệ quản trị viên.");
    }

    public boolean matchesMerchant(String merchant) { return config.getTmnCode().equals(merchant); }

    public String createPaymentUrl(Payment payment, HttpServletRequest request) {
        requireConfigured();
        Map<String, String> fields = new TreeMap<>();
        fields.put("vnp_Version", "2.1.0");
        fields.put("vnp_Command", "pay");
        fields.put("vnp_TmnCode", config.getTmnCode());
        fields.put("vnp_Amount", payment.getAmount().movePointRight(2).toBigIntegerExact().toString());
        fields.put("vnp_CurrCode", "VND");
        fields.put("vnp_TxnRef", payment.getTransactionId());
        fields.put("vnp_OrderInfo", "Thanh toan ve CinemaHub " + payment.getTransactionId());
        fields.put("vnp_OrderType", "other");
        fields.put("vnp_Locale", "vn");
        fields.put("vnp_ReturnUrl", config.getReturnUrl());
        String ip = request == null ? "127.0.0.1" : request.getRemoteAddr();
        fields.put("vnp_IpAddr", "0:0:0:0:0:0:0:1".equals(ip) ? "127.0.0.1" : ip);
        DateTimeFormatter format = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
        fields.put("vnp_CreateDate", payment.getCreatedAt().format(format));
        fields.put("vnp_ExpireDate", payment.getExpiresAt().format(format));
        // Omit bank code: VNPay offers methods enabled for this merchant.
        String data = canonical(fields);
        return config.getPayUrl() + "?" + data + "&vnp_SecureHash=" + VnpayConfig.hmacSHA512(config.getHashSecret(), data);
    }

    public boolean verifySignature(Map<String, String> params) {
        if (!isConfigured()) return false;
        String actual = params.get("vnp_SecureHash");
        if (actual == null || !actual.matches("[a-fA-F0-9]{128}")) return false;
        Map<String, String> fields = new TreeMap<>(params);
        fields.remove("vnp_SecureHash");
        fields.remove("vnp_SecureHashType");
        String expected = VnpayConfig.hmacSHA512(config.getHashSecret(), canonical(fields));
        return MessageDigest.isEqual(expected.getBytes(StandardCharsets.US_ASCII),
                actual.toLowerCase(java.util.Locale.ROOT).getBytes(StandardCharsets.US_ASCII));
    }

    private String canonical(Map<String, String> fields) {
        return new TreeMap<>(fields).entrySet().stream()
                .filter(e -> e.getValue() != null && !e.getValue().isEmpty())
                .map(e -> URLEncoder.encode(e.getKey(), StandardCharsets.US_ASCII) + "="
                        + URLEncoder.encode(e.getValue(), StandardCharsets.US_ASCII)).collect(Collectors.joining("&"));
    }
}
