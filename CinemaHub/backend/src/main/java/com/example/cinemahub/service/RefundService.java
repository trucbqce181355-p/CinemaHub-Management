package com.example.cinemahub.service;

import com.example.cinemahub.model.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.mongodb.core.*;
import org.springframework.data.mongodb.core.query.*;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class RefundService {
    private final MongoTemplate mongo;
    private final AdmissionCoordinator admission;
    private final VnPayRefundGateway gateway;
    private final TicketDeliveryService delivery;
    @Value("${payment.refund.cutoff-minutes:120}") private long cutoffMinutes = 120;
    @Value("${payment.scheduler.enabled:true}") private boolean recoveryEnabled = true;

    public Booking accessible(String id, String actor, boolean staff) {
        Booking booking = mongo.findById(id, Booking.class);
        if (booking == null) throw error(HttpStatus.NOT_FOUND, "Không tìm thấy đơn đặt vé");
        if (!staff && !Objects.equals(actor, booking.getUserId()))
            throw error(HttpStatus.FORBIDDEN, "Bạn không có quyền truy cập đơn này");
        return booking;
    }

    public Map<String, Object> policy(String id, String actor, boolean staff) {
        return admission.read(() -> {
            Booking booking = accessible(id, actor, staff);
            String message = "Có thể yêu cầu hoàn toàn bộ số tiền đã trả";
            boolean eligible = booking.getRefund() == null;
            try { validate(booking, true); }
            catch (ResponseStatusException ex) { eligible = false; message = ex.getReason(); }
            if (booking.getRefund() != null) message = "Đơn đã có yêu cầu hoàn tiền";
            Map<String, Object> result = new HashMap<>();
            result.put("eligible", eligible);
            result.put("message", message);
            result.put("cutoffMinutes", cutoffMinutes);
            result.put("refund", booking.getRefund());
            result.put("bookingReference", Objects.toString(booking.getBookingReference(), ""));
            result.put("movieTitle", Objects.toString(booking.getMovieTitle(), ""));
            result.put("amount", booking.getPayment() == null ? 0 : booking.getPayment().getAmount());
            result.put("showtimeStart", booking.getShowtimeStart());
            return result;
        });
    }

    public Refund request(String id, String actor, boolean staff, String reason, boolean agrees) {
        return admission.write(() -> {
            Booking booking = accessible(id, actor, staff);
            if (booking.getRefund() != null) return booking.getRefund();
            if (!agrees) throw error(HttpStatus.BAD_REQUEST, "Vui lòng đồng ý chính sách hoàn tiền");
            String cleaned = reason(reason);
            validate(booking, true);
            Refund refund = new Refund();
            refund.setId(UUID.randomUUID().toString().replace("-", ""));
            refund.setStatus("PENDING_APPROVAL");
            refund.setAmount(booking.getPayment().getAmount());
            refund.setReason(cleaned);
            refund.setRequestedBy(actor);
            refund.setRequestedAt(LocalDateTime.now());
            refund.getAudit().add(new Refund.Event("PENDING_APPROVAL", actor, refund.getRequestedAt(), "REQUESTED"));
            Criteria guard = Criteria.where("_id").is(id).and("version").is(booking.getVersion())
                    .and("status").is("CONFIRMED").and("payment.status").is("SUCCESS").and("refund").is(null);
            Booking updated = change(guard, new Update().set("refund", refund));
            if (updated != null) return updated.getRefund();
            Booking current = accessible(id, actor, staff);
            if (current.getRefund() != null) return current.getRefund();
            throw error(HttpStatus.CONFLICT, "Đơn vừa thay đổi; vui lòng thử lại");
        });
    }

    public List<Booking> queue(String status) {
        Criteria filter = Criteria.where("refund").ne(null);
        if (status != null && !status.isBlank()) {
            if (!Set.of("PENDING_APPROVAL", "PROCESSING", "SUCCEEDED", "REJECTED", "FAILED", "REVIEW_REQUIRED").contains(status))
                throw error(HttpStatus.BAD_REQUEST, "Trạng thái hoàn tiền không hợp lệ");
            filter.and("refund.status").is(status);
        }
        return mongo.find(Query.query(filter).with(org.springframework.data.domain.Sort.by("refund.requestedAt").descending()).limit(200), Booking.class);
    }

    public Refund approve(String id, String actor, String ip) {
        Booking existing = accessible(id, actor, true);
        if (existing.getRefund() == null) throw error(HttpStatus.CONFLICT, "Chưa có yêu cầu hoàn tiền");
        if (!"PENDING_APPROVAL".equals(existing.getRefund().getStatus())) return existing.getRefund();
        gateway.requireConfigured();
        Booking claimed = admission.write(() -> {
            Booking booking = accessible(id, actor, true);
            if (booking.getRefund() == null) throw error(HttpStatus.CONFLICT, "Chưa có yêu cầu hoàn tiền");
            if (!"PENDING_APPROVAL".equals(booking.getRefund().getStatus())) return null;
            validate(booking, false);
            LocalDateTime now = LocalDateTime.now();
            return change(Criteria.where("_id").is(id).and("refund.id").is(booking.getRefund().getId())
                            .and("refund.status").is("PENDING_APPROVAL").and("payment.status").is("SUCCESS").and("status").is("CONFIRMED"),
                    new Update().set("refund.status", "PROCESSING").set("refund.decidedBy", actor)
                            .set("refund.decidedAt", now).set("refund.processingAt", now)
                            .push("refund.audit", new Refund.Event("PROCESSING", actor, now, "APPROVED")));
        });
        if (claimed == null) return accessible(id, actor, true).getRefund();
        VnPayRefundGateway.Outcome outcome = gateway.refund(claimed, ip);
        return finish(claimed, outcome, actor);
    }

    public Refund reconcile(String id, String actor, String ip) {
        Booking booking = accessible(id, actor, true);
        if (booking.getRefund() == null) throw error(HttpStatus.NOT_FOUND, "Chưa có yêu cầu hoàn tiền");
        if (!Set.of("REVIEW_REQUIRED", "PROCESSING").contains(booking.getRefund().getStatus())) return booking.getRefund();
        VnPayRefundGateway.Outcome outcome = gateway.query(booking, ip);
        if (!"SUCCEEDED".equals(outcome.status())) return booking.getRefund();
        return finish(booking, outcome, actor);
    }

    private Refund finish(Booking snapshot, VnPayRefundGateway.Outcome outcome, String actor) {
        return admission.write(() -> {
            LocalDateTime now = LocalDateTime.now();
            Update update = new Update().set("refund.status", outcome.status()).set("refund.providerCode", outcome.code())
                    .set("refund.providerTransactionId", outcome.transactionId())
                    .push("refund.audit", new Refund.Event(outcome.status(), actor, now, outcome.code()));
            if ("SUCCEEDED".equals(outcome.status())) {
                update.set("status", "REFUNDED").set("payment.status", "REFUNDED")
                        .set("payment.updatedAt", now).set("refund.decisionReason", "VNPay xác nhận hoàn tiền toàn phần");
            }
            Booking updated = change(Criteria.where("_id").is(snapshot.getId())
                    .and("refund.id").is(snapshot.getRefund().getId())
                    .and("refund.status").in("PROCESSING", "REVIEW_REQUIRED")
                    .and("payment.status").is("SUCCESS").and("status").is("CONFIRMED"), update);
            if (updated != null && "SUCCEEDED".equals(outcome.status())) effectsSafely(updated);
            return accessible(snapshot.getId(), actor, true).getRefund();
        });
    }

    public Refund reject(String id, String actor, String note) {
        return admission.write(() -> {
            Booking booking = accessible(id, actor, true);
            if (booking.getRefund() == null) throw error(HttpStatus.NOT_FOUND, "Chưa có yêu cầu hoàn tiền");
            if ("REJECTED".equals(booking.getRefund().getStatus())) return booking.getRefund();
            String cleaned = reason(note);
            Booking updated = change(Criteria.where("_id").is(id).and("refund.status").in("PENDING_APPROVAL", "FAILED"),
                    new Update().set("refund.status", "REJECTED").set("refund.decisionReason", cleaned)
                            .set("refund.decidedBy", actor).set("refund.decidedAt", LocalDateTime.now())
                            .push("refund.audit", new Refund.Event("REJECTED", actor, LocalDateTime.now(), "REJECTED")));
            if (updated == null) throw error(HttpStatus.CONFLICT, "Đã gửi lệnh hoàn tiền; cần đối soát, không thể từ chối");
            effectsSafely(updated);
            return updated.getRefund();
        });
    }

    private void validate(Booking booking, boolean checkTime) {
        Payment payment = booking.getPayment();
        if (!"CONFIRMED".equals(booking.getStatus()) || payment == null || !"SUCCESS".equals(payment.getStatus())
                || payment.isReconciliationRequired() || !"VNPAY".equals(payment.getProvider())
                || !"VND".equals(payment.getCurrency()) || payment.getAmount() == null || payment.getAmount().signum() <= 0
                || booking.getTotalAmount() == null || !Double.isFinite(booking.getTotalAmount())
                || payment.getAmount().compareTo(BigDecimal.valueOf(booking.getTotalAmount())) != 0
                || payment.getTransactionId() == null || payment.getProviderTransactionId() == null
                || !payment.getProviderTransactionId().matches("[1-9][0-9]*") || payment.getCreatedAt() == null)
            throw error(HttpStatus.CONFLICT, "Chỉ hỗ trợ hoàn toàn phần đơn VNPay đã thanh toán hợp lệ; đơn khác cần xử lý tại quầy");
        Ticket ticket = booking.getTicketId() == null ? null : mongo.findById(booking.getTicketId(), Ticket.class);
        if (TicketUsage.state(booking, ticket) != TicketUsage.State.UNUSED)
            throw error(HttpStatus.CONFLICT, "Vé đã sử dụng, dùng một phần hoặc chưa phát hành; không thể hoàn tiền");
        Showtime showtime = booking.getShowtimeId() == null ? null : mongo.findById(booking.getShowtimeId(), Showtime.class);
        if (checkTime && (cutoffMinutes < 0 || showtime == null || showtime.getStartTime() == null
                || LocalDateTime.now().isAfter(showtime.getStartTime().minusMinutes(cutoffMinutes))))
            throw error(HttpStatus.CONFLICT, "Yêu cầu phải gửi trước giờ chiếu ít nhất " + cutoffMinutes + " phút");
    }

    @Scheduled(fixedDelayString = "${payment.refund.scan-ms:30000}")
    public void recover() {
        if (!recoveryEnabled) return;
        LocalDateTime now = LocalDateTime.now();
        mongo.updateMulti(Query.query(Criteria.where("refund.status").is("PROCESSING")
                        .and("refund.processingAt").lte(now.minusMinutes(5))),
                new Update().set("refund.status", "REVIEW_REQUIRED").set("refund.providerCode", "WORKER_INTERRUPTED")
                        .push("refund.audit", new Refund.Event("REVIEW_REQUIRED", "SYSTEM", now, "WORKER_INTERRUPTED")), Booking.class);
        for (Booking booking : mongo.find(Query.query(Criteria.where("refund.status").in("SUCCEEDED", "REJECTED")
                .and("refund.effectsApplied").ne(true)).limit(100), Booking.class)) effectsSafely(booking);
    }

    private void effectsSafely(Booking booking) {
        try {
            if ("SUCCEEDED".equals(booking.getRefund().getStatus())) {
                mongo.updateFirst(Query.query(Criteria.where("_id").is(booking.getTicketId()).and("status").is("Paid")),
                        new Update().set("status", "Refunded"), Ticket.class);
                Ticket ticket = mongo.findById(booking.getTicketId(), Ticket.class);
                if (ticket == null || !"Refunded".equals(ticket.getStatus())) return;
            }
            delivery.enqueueRefund(booking);
            if ("REJECTED".equals(booking.getRefund().getStatus())) delivery.retry(booking);
            mongo.updateFirst(Query.query(Criteria.where("_id").is(booking.getId())
                    .and("refund.id").is(booking.getRefund().getId()).and("refund.status").is(booking.getRefund().getStatus())),
                    new Update().set("refund.effectsApplied", true), Booking.class);
        } catch (RuntimeException ex) {
            org.slf4j.LoggerFactory.getLogger(getClass()).warn("Refund side effects deferred for {}", booking.getId());
        }
    }

    private Booking change(Criteria guard, Update update) {
        return mongo.findAndModify(Query.query(guard), update.inc("version", 1).set("updatedAt", LocalDateTime.now()),
                FindAndModifyOptions.options().returnNew(true), Booking.class);
    }

    private String reason(String value) {
        if (value == null || value.trim().length() < 5 || value.length() > 1000)
            throw error(HttpStatus.BAD_REQUEST, "Lý do cần từ 5 đến 1000 ký tự");
        return value.trim();
    }

    private ResponseStatusException error(HttpStatus status, String message) {
        return new ResponseStatusException(status, message);
    }
}
