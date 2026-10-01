package com.example.cinemahub.service;

import com.example.cinemahub.model.Booking;
import com.example.cinemahub.model.Payment;
import com.example.cinemahub.repository.PaymentRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PaymentService {
    private final PaymentRepository payments;
    private final VnPayService gateway;
    private final BookingService bookings;

    public Payment initiate(String bookingId, String userId, HttpServletRequest request) {
        return initiate(bookingId, userId, request, Map.of());
    }

    public Payment initiate(String bookingId, String userId, HttpServletRequest request, Map<String, String> contact) {
        if (userId == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Vui lòng đăng nhập");
        gateway.requireConfigured();
        Booking booking = owned(bookingId, userId);
        LocalDateTime now = LocalDateTime.now();
        if (booking.getHoldExpiresAt() == null || !booking.getHoldExpiresAt().isAfter(now)) {
            payments.expire(bookingId, now);
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Thời gian giữ ghế đã hết");
        }
        if (booking.getPayment() != null) return existing(booking);
        if (!"PENDING".equals(booking.getStatus())) throw conflict();
        if (contact.containsKey("customerName")) booking.setCustomerName(contactField(contact, "customerName", 120));
        if (contact.containsKey("customerEmail")) booking.setCustomerEmail(contactField(contact, "customerEmail", 254));
        if (contact.containsKey("customerPhone")) booking.setCustomerPhone(contactField(contact, "customerPhone", 32));
        if (booking.getTotalAmount() == null || !Double.isFinite(booking.getTotalAmount()) || booking.getTotalAmount() <= 0)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Số tiền đơn hàng không hợp lệ");
        Payment payment = new Payment();
        payment.setTransactionId(UUID.randomUUID().toString().replace("-", ""));
        payment.setAmount(BigDecimal.valueOf(booking.getTotalAmount()).setScale(0, java.math.RoundingMode.UNNECESSARY));
        payment.setCreatedAt(now);
        payment.setUpdatedAt(now);
        payment.setExpiresAt(booking.getHoldExpiresAt());
        payment.setCheckoutUrl(gateway.createPaymentUrl(payment, request));
        Booking claimed = payments.initiate(booking, payment, now);
        if (claimed != null) return claimed.getPayment();
        return existing(owned(bookingId, userId));
    }

    private String contactField(Map<String, String> contact, String key, int limit) {
        String value = java.util.Objects.toString(contact.get(key), "").trim();
        if (value.length() > limit || value.contains("\r") || value.contains("\n"))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Thông tin người nhận không hợp lệ");
        return value;
    }

    private Payment existing(Booking booking) {
        if (booking.getPayment() == null || !"PENDING".equals(booking.getPayment().getStatus())
                || !"PENDING".equals(booking.getStatus())) throw conflict();
        return booking.getPayment();
    }

    private ResponseStatusException conflict() {
        return new ResponseStatusException(HttpStatus.CONFLICT, "Đơn đã thay đổi hoặc thanh toán đã kết thúc; hãy tải lại đơn");
    }

    public Booking owned(String id, String userId) {
        Booking booking = payments.find(id);
        if (booking == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy đơn");
        if (userId == null || !userId.equals(booking.getUserId()))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền truy cập đơn này");
        return booking;
    }

    /** Both browser return and IPN use the same signed, conditional transition. */
    public String confirm(Map<String, String> fields) {
        if (!gateway.verifySignature(fields)) return "97";
        Booking booking = payments.findTransaction(fields.get("vnp_TxnRef"));
        if (booking == null || booking.getPayment() == null) return "01";
        Payment payment = booking.getPayment();
        try {
            if (payment.getAmount().movePointRight(2).compareTo(new BigDecimal(fields.get("vnp_Amount"))) != 0) return "04";
        } catch (RuntimeException ex) { return "04"; }
        if (!gateway.matchesMerchant(fields.get("vnp_TmnCode"))
                || (fields.containsKey("vnp_CurrCode") && !"VND".equals(fields.get("vnp_CurrCode")))) return "97";
        String response = fields.get("vnp_ResponseCode");
        String transactionStatus = fields.get("vnp_TransactionStatus");
        if (response == null || transactionStatus == null) return "99";
        boolean success = "00".equals(response) && "00".equals(transactionStatus);
        String providerId = fields.get("vnp_TransactionNo");
        if (success && (providerId == null || !providerId.matches("[1-9][0-9]*"))) return "99";
        LocalDateTime now = LocalDateTime.now();
        payments.expire(booking.getId(), now);
        Booking updated = payments.complete(payment.getTransactionId(), success, providerId, response, now);
        if (updated == null) {
            if (success) payments.flagReconciliation(booking.getId(), providerId, now);
            return "02";
        }
        // Durable SUCCESS survives a ticket persistence failure; scheduler retries issuance.
        if (success) issueSafely(updated);
        return "00";
    }

    public void processTimedOutPayments() {
        LocalDateTime now = LocalDateTime.now();
        for (Booking booking : payments.expired(now)) {
            try { payments.expire(booking.getId(), now); }
            catch (RuntimeException ex) { logFailure("expire", booking.getId()); }
        }
        for (Booking booking : payments.unissued()) issueSafely(booking);
    }

    private void issueSafely(Booking booking) {
        try { bookings.issuePaidTicket(booking.getId()); }
        catch (RuntimeException ex) { logFailure("issue ticket; retry scheduled", booking.getId()); }
    }

    private void logFailure(String operation, String id) {
        org.slf4j.LoggerFactory.getLogger(getClass()).warn("Payment {} failed for booking {}", operation, id);
    }

    public Map<String, Object> result(String transactionId, String userId) {
        if (transactionId == null || !transactionId.matches("[a-f0-9]{32}"))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mã giao dịch không hợp lệ");
        Booking booking = payments.findTransaction(transactionId);
        if (booking == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy giao dịch");
        owned(booking.getId(), userId);
        Map<String, Object> result = new java.util.HashMap<>(bookings.getBookingDetails(booking.getId()));
        result.put("status", booking.getPayment().isReconciliationRequired() ? "REVIEW_REQUIRED" : booking.getPayment().getStatus());
        result.put("transactionNo", java.util.Objects.toString(booking.getPayment().getProviderTransactionId(), ""));
        return result;
    }
}
