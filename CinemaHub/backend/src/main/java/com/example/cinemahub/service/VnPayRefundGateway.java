package com.example.cinemahub.service;

import com.example.cinemahub.config.VnpayConfig;
import com.example.cinemahub.model.Booking;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

/** Uses VNPay's documented pipe-delimited refund/query checksum, not the checkout URL encoding. */
@Service
@RequiredArgsConstructor
public class VnPayRefundGateway {
    private final VnpayConfig config;
    @Value("${vnpay.refund-enabled:false}") private boolean enabled;
    @Value("${vnpay.refund-api-url:https://sandbox.vnpayment.vn/merchant_webapi/api/transaction}")
    private String apiUrl;
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

    public record Outcome(String status, String code, String transactionId) {}

    public void requireConfigured() {
        if (!enabled || config.getTmnCode() == null || config.getTmnCode().isBlank()
                || config.getHashSecret() == null || config.getHashSecret().isBlank())
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Chưa bật API hoàn tiền VNPay. Yêu cầu vẫn chờ duyệt; chưa gửi lệnh hoàn tiền.");
    }

    public Outcome refund(Booking booking, String ip) {
        Map<String, String> fields = base(booking, "refund", booking.getRefund().getId(), booking.getRefund().getProcessingAt(), ip);
        fields.put("vnp_TransactionType", "02");
        fields.put("vnp_Amount", booking.getRefund().getAmount().movePointRight(2).toBigIntegerExact().toString());
        fields.put("vnp_CreateBy", booking.getRefund().getDecidedBy());
        fields.put("vnp_SecureHash", sign(fields, "vnp_RequestId", "vnp_Version", "vnp_Command", "vnp_TmnCode",
                "vnp_TransactionType", "vnp_TxnRef", "vnp_Amount", "vnp_TransactionNo", "vnp_TransactionDate",
                "vnp_CreateBy", "vnp_CreateDate", "vnp_IpAddr", "vnp_OrderInfo"));
        return exchange(fields, booking, false);
    }

    /** Read-only query. It can finish a refund only if VNPay explicitly returns type 02, status 00. */
    public Outcome query(Booking booking, String ip) {
        Map<String, String> fields = base(booking, "querydr", UUID.randomUUID().toString().replace("-", ""), LocalDateTime.now(), ip);
        if (booking.getRefund().getProviderTransactionId() != null)
            fields.put("vnp_TransactionNo", booking.getRefund().getProviderTransactionId());
        fields.put("vnp_SecureHash", sign(fields, "vnp_RequestId", "vnp_Version", "vnp_Command", "vnp_TmnCode",
                "vnp_TxnRef", "vnp_TransactionDate", "vnp_CreateDate", "vnp_IpAddr", "vnp_OrderInfo"));
        return exchange(fields, booking, true);
    }

    private Map<String, String> base(Booking booking, String command, String requestId, LocalDateTime created, String ip) {
        requireConfigured();
        Map<String, String> f = new LinkedHashMap<>();
        f.put("vnp_RequestId", requestId);
        f.put("vnp_Version", "2.1.0");
        f.put("vnp_Command", command);
        f.put("vnp_TmnCode", config.getTmnCode());
        f.put("vnp_TxnRef", booking.getPayment().getTransactionId());
        f.put("vnp_TransactionNo", booking.getPayment().getProviderTransactionId());
        f.put("vnp_TransactionDate", booking.getPayment().getCreatedAt().format(DATE));
        f.put("vnp_CreateDate", created.format(DATE));
        f.put("vnp_IpAddr", ip == null || ip.contains(":") ? "127.0.0.1" : ip);
        f.put("vnp_OrderInfo", "CinemaHub " + command + " " + booking.getRefund().getId());
        return f;
    }

    @SuppressWarnings("unchecked")
    private Outcome exchange(Map<String, String> fields, Booking booking, boolean query) {
        try {
            var factory = new JdkClientHttpRequestFactory(HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build());
            factory.setReadTimeout(Duration.ofSeconds(15));
            Map<String, Object> raw = RestClient.builder().requestFactory(factory).build().post().uri(apiUrl)
                    .contentType(org.springframework.http.MediaType.APPLICATION_JSON).body(fields).retrieve().body(Map.class);
            Map<String, String> result = new HashMap<>();
            if (raw != null) raw.forEach((key, value) -> result.put(key, Objects.toString(value, "")));
            if (!verify(result, query) || !config.getTmnCode().equals(result.get("vnp_TmnCode"))
                    || !booking.getPayment().getTransactionId().equals(result.get("vnp_TxnRef"))
                    || !fields.get("vnp_Command").equals(result.get("vnp_Command")))
                return new Outcome("REVIEW_REQUIRED", "UNVERIFIED_RESPONSE", null);
            String code = result.get("vnp_ResponseCode");
            String status = result.get("vnp_TransactionStatus");
            boolean sameAmount = booking.getRefund().getAmount().movePointRight(2)
                    .compareTo(new java.math.BigDecimal(result.get("vnp_Amount"))) == 0;
            String providerId = result.get("vnp_TransactionNo");
            if (sameAmount && "00".equals(code) && "00".equals(status)
                    && "02".equals(result.get("vnp_TransactionType"))
                    && providerId != null && providerId.matches("[1-9][0-9]*"))
                return new Outcome("SUCCEEDED", code, providerId);
            if (!query && ("09".equals(status) || Set.of("02", "03", "91", "95", "97").contains(Objects.toString(code, ""))))
                return new Outcome("FAILED", code, providerId);
            // 94 means already being processed; 05/06 are pending, never success.
            return new Outcome("REVIEW_REQUIRED", Objects.toString(code, "UNKNOWN"), providerId);
        } catch (Exception ex) {
            // The provider may have accepted the request before a transport failure. Never auto-resend.
            return new Outcome("REVIEW_REQUIRED", "TRANSPORT_OR_RESPONSE_ERROR", null);
        }
    }

    boolean verify(Map<String, String> fields, boolean query) {
        String hash = fields.get("vnp_SecureHash");
        if (hash == null || !hash.matches("[a-fA-F0-9]{128}")) return false;
        List<String> keys = new ArrayList<>(List.of("vnp_ResponseId", "vnp_Command", "vnp_ResponseCode", "vnp_Message",
                "vnp_TmnCode", "vnp_TxnRef", "vnp_Amount", "vnp_BankCode", "vnp_PayDate", "vnp_TransactionNo",
                "vnp_TransactionType", "vnp_TransactionStatus", "vnp_OrderInfo"));
        if (query) keys.addAll(List.of("vnp_PromotionCode", "vnp_PromotionAmount"));
        String expected = sign(fields, keys.toArray(String[]::new));
        return MessageDigest.isEqual(expected.getBytes(StandardCharsets.US_ASCII),
                hash.toLowerCase(Locale.ROOT).getBytes(StandardCharsets.US_ASCII));
    }

    private String sign(Map<String, String> fields, String... keys) {
        String data = Arrays.stream(keys).map(key -> Objects.toString(fields.get(key), ""))
                .collect(java.util.stream.Collectors.joining("|"));
        return VnpayConfig.hmacSHA512(config.getHashSecret(), data);
    }
}
