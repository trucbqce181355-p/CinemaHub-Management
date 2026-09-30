package com.example.cinemahub.controller;

import com.example.cinemahub.dto.ConfirmBookingRequest;
import com.example.cinemahub.model.Booking;
import com.example.cinemahub.repository.BookingRepository;
import com.example.cinemahub.service.BookingService;
import com.example.cinemahub.service.VnPayService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/payment")
@CrossOrigin(origins = "*")
public class PaymentController {

    @Autowired
    private VnPayService vnPayService;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private BookingService bookingService;

    /**
     * 1. Create VNPAY Payment URL for a booking
     */
    @PostMapping("/create-vnpay-url")
    public ResponseEntity<?> createVnPayUrl(@RequestBody Map<String, Object> requestBody, HttpServletRequest request) {
        try {
            String bookingId = (String) requestBody.get("bookingId");
            if (bookingId == null || bookingId.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Thiếu bookingId"));
            }

            Booking booking = bookingRepository.findById(bookingId)
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn đặt vé: " + bookingId));

            if (!"PENDING".equalsIgnoreCase(booking.getStatus())) {
                return ResponseEntity.badRequest().body(Map.of("error", "Đơn đặt vé không ở trạng thái chờ thanh toán"));
            }

            // Update customer details if provided
            if (requestBody.containsKey("customerName") && requestBody.get("customerName") != null) {
                booking.setCustomerName((String) requestBody.get("customerName"));
            }
            if (requestBody.containsKey("customerEmail") && requestBody.get("customerEmail") != null) {
                booking.setCustomerEmail((String) requestBody.get("customerEmail"));
            }
            if (requestBody.containsKey("customerPhone") && requestBody.get("customerPhone") != null) {
                booking.setCustomerPhone((String) requestBody.get("customerPhone"));
            }
            booking.setPaymentMethod("VNPAY");
            bookingRepository.save(booking);

            String bankCode = requestBody.containsKey("bankCode") && requestBody.get("bankCode") != null
                    ? (String) requestBody.get("bankCode")
                    : "NCB";
            String paymentUrl = vnPayService.createPaymentUrl(booking, bankCode, request);
            return ResponseEntity.ok(Map.of(
                    "paymentUrl", paymentUrl,
                    "bookingReference", booking.getBookingReference(),
                    "totalAmount", booking.getTotalAmount()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * 2. VNPAY Return URL (Browser redirect after payment)
     */
    @GetMapping("/vnpay-callback")
    public ResponseEntity<?> handleVnPayCallback(@RequestParam Map<String, String> queryParams) {
        try {
            boolean isValidSignature = vnPayService.verifySignature(queryParams);
            if (!isValidSignature) {
                return ResponseEntity.badRequest().body(Map.of(
                        "status", "INVALID_CHECKSUM",
                        "message", "Chữ ký xác thực giao dịch VNPAY không hợp lệ!"
                ));
            }

            String vnp_ResponseCode = queryParams.get("vnp_ResponseCode");
            String vnp_TxnRef = queryParams.get("vnp_TxnRef");
            String vnp_TransactionNo = queryParams.get("vnp_TransactionNo");
            String vnp_BankCode = queryParams.get("vnp_BankCode");
            String vnp_Amount = queryParams.get("vnp_Amount");

            Booking booking = bookingRepository.findByBookingReference(vnp_TxnRef)
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn đặt vé có mã: " + vnp_TxnRef));

            if ("00".equals(vnp_ResponseCode)) {
                // Payment Successful
                if ("PENDING".equalsIgnoreCase(booking.getStatus())) {
                    ConfirmBookingRequest confirmReq = new ConfirmBookingRequest();
                    confirmReq.setPaymentMethod("VNPAY");
                    confirmReq.setCustomerName(booking.getCustomerName());
                    confirmReq.setCustomerEmail(booking.getCustomerEmail());
                    confirmReq.setCustomerPhone(booking.getCustomerPhone());
                    confirmReq.setPromoCode(booking.getPromoCode());

                    Map<String, Object> confirmResult = bookingService.confirmBooking(booking.getId(), confirmReq);
                    Map<String, Object> res = new HashMap<>(confirmResult);
                    res.put("status", "SUCCESS");
                    res.put("transactionNo", vnp_TransactionNo);
                    res.put("bankCode", vnp_BankCode);
                    res.put("amount", Double.parseDouble(vnp_Amount) / 100);
                    return ResponseEntity.ok(res);
                } else {
                    // Already confirmed
                    Map<String, Object> details = bookingService.getBookingDetails(booking.getId());
                    Map<String, Object> res = new HashMap<>(details);
                    res.put("status", "SUCCESS");
                    res.put("message", "Giao dịch đã được ghi nhận thành công");
                    return ResponseEntity.ok(res);
                }
            } else {
                // Payment Failed or Cancelled
                return ResponseEntity.ok(Map.of(
                        "status", "FAILED",
                        "responseCode", vnp_ResponseCode,
                        "bookingReference", vnp_TxnRef,
                        "message", "Giao dịch không thành công hoặc quý khách đã hủy thanh toán trên cổng VNPAY."
                ));
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("status", "ERROR", "message", e.getMessage()));
        }
    }

    /**
     * 3. VNPAY IPN (Instant Payment Notification - Server to Server)
     */
    @GetMapping("/vnpay-ipn")
    public ResponseEntity<?> handleVnPayIpn(@RequestParam Map<String, String> queryParams) {
        try {
            boolean isValidSignature = vnPayService.verifySignature(queryParams);
            if (!isValidSignature) {
                return ResponseEntity.ok(Map.of("RspCode", "97", "Message", "Invalid Checksum"));
            }

            String vnp_TxnRef = queryParams.get("vnp_TxnRef");
            String vnp_ResponseCode = queryParams.get("vnp_ResponseCode");

            Booking booking = bookingRepository.findByBookingReference(vnp_TxnRef).orElse(null);
            if (booking == null) {
                return ResponseEntity.ok(Map.of("RspCode", "01", "Message", "Order not found"));
            }

            if ("CONFIRMED".equalsIgnoreCase(booking.getStatus())) {
                return ResponseEntity.ok(Map.of("RspCode", "02", "Message", "Order already confirmed"));
            }

            if ("00".equals(vnp_ResponseCode)) {
                ConfirmBookingRequest confirmReq = new ConfirmBookingRequest();
                confirmReq.setPaymentMethod("VNPAY");
                confirmReq.setCustomerName(booking.getCustomerName());
                confirmReq.setCustomerEmail(booking.getCustomerEmail());
                confirmReq.setCustomerPhone(booking.getCustomerPhone());
                confirmReq.setPromoCode(booking.getPromoCode());

                bookingService.confirmBooking(booking.getId(), confirmReq);
                return ResponseEntity.ok(Map.of("RspCode", "00", "Message", "Confirm Success"));
            } else {
                return ResponseEntity.ok(Map.of("RspCode", "00", "Message", "Confirm Success"));
            }
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("RspCode", "99", "Message", "Unknown Error: " + e.getMessage()));
        }
    }

    /**
     * 4. Dev Sandbox Simulation: Simulates instant successful VNPAY callback
     * when the VNPAY Sandbox merchant terminal is pending review/approval by VNPAY.
     */
    @PostMapping("/simulate-vnpay-success")
    public ResponseEntity<?> simulateVnPaySuccess(@RequestBody Map<String, String> body) {
        try {
            String bookingId = body.get("bookingId");
            if (bookingId == null || bookingId.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Thiếu bookingId"));
            }

            Booking booking = bookingRepository.findById(bookingId)
                    .or(() -> bookingRepository.findByBookingReference(bookingId))
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn đặt vé: " + bookingId));

            ConfirmBookingRequest confirmReq = new ConfirmBookingRequest();
            confirmReq.setPaymentMethod("VNPAY");
            confirmReq.setCustomerName(booking.getCustomerName());
            confirmReq.setCustomerEmail(booking.getCustomerEmail());
            confirmReq.setCustomerPhone(booking.getCustomerPhone());
            confirmReq.setPromoCode(booking.getPromoCode());

            Map<String, Object> confirmResult = bookingService.confirmBooking(booking.getId(), confirmReq);
            Map<String, Object> res = new HashMap<>(confirmResult);
            res.put("status", "SUCCESS");
            res.put("transactionNo", "VNPAY-TEST-" + System.currentTimeMillis());
            res.put("bankCode", "NCB");
            res.put("amount", booking.getTotalAmount());
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
