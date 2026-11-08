package com.example.cinemahub.service;

import com.example.cinemahub.model.*;
import jakarta.mail.internet.InternetAddress;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.query.*;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import org.springframework.web.util.HtmlUtils;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class TicketDeliveryService {
    private final MongoTemplate mongo;
    private final JavaMailSender mail;
    private final TicketQrService qr;
    @Value("${payment.email.enabled:false}") private boolean enabled;
    @Value("${spring.mail.username:}") private String sender;

    public EmailJob enqueueTicket(Booking booking, Ticket ticket) {
        EmailJob job = enqueue(booking, ticket.getId(), "TICKET", "ticket-" + ticket.getId());
        mongo.updateFirst(Query.query(Criteria.where("_id").is(booking.getId())
                        .and("ticketId").is(ticket.getId()).and("payment.status").is("SUCCESS")),
                new Update().set("ticketEmailQueued", true), Booking.class);
        return job;
    }

    public EmailJob enqueueRefund(Booking booking) {
        return enqueue(booking, booking.getTicketId(), "REFUND_" + booking.getRefund().getStatus(),
                "refund-" + booking.getRefund().getId() + "-" + booking.getRefund().getStatus());
    }

    private EmailJob enqueue(Booking booking, String ticketId, String kind, String id) {
        EmailJob job = new EmailJob();
        job.setId(id);
        job.setBookingId(booking.getId());
        job.setTicketId(ticketId);
        job.setKind(kind);
        job.setRecipient(booking.getCustomerEmail());
        if (!validEmail(job.getRecipient())) {
            job.setStatus("FAILED");
            job.setLastError("INVALID_RECIPIENT");
        }
        try { return mongo.insert(job); }
        catch (org.springframework.dao.DuplicateKeyException duplicate) {
            return mongo.findById(id, EmailJob.class);
        }
    }

    public Ticket paidTicket(Booking booking) {
        if (!"CONFIRMED".equals(booking.getStatus()) || booking.getPayment() == null
                || !"SUCCESS".equals(booking.getPayment().getStatus())
                || booking.getPayment().isReconciliationRequired() || Refund.blocksAdmission(booking.getRefund()))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Chưa có vé thanh toán hợp lệ hoặc vé đang được hoàn tiền");
        Ticket ticket = booking.getTicketId() == null ? null : mongo.findById(booking.getTicketId(), Ticket.class);
        if (!TicketUsage.matchesBooking(booking, ticket))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Vé đang được phát hành; vui lòng thử lại sau");
        return ticket;
    }

    public Map<String, Object> status(Booking booking) {
        EmailJob job = booking.getTicketId() == null ? null : mongo.findById("ticket-" + booking.getTicketId(), EmailJob.class);
        return Map.of("enabled", enabled, "status", job == null ? "NOT_QUEUED" : job.getStatus(),
                "attempts", job == null ? 0 : job.getAttempts());
    }

    public Map<String, Object> retry(Booking booking) {
        Ticket ticket = paidTicket(booking);
        EmailJob job = enqueueTicket(booking, ticket);
        // Explicit customer retry is allowed only after a failed delivery. SENT is idempotent.
        if (validEmail(booking.getCustomerEmail()))
            mongo.updateFirst(Query.query(Criteria.where("_id").is(job.getId()).and("status").in("FAILED", "CANCELLED")),
                    new Update().set("status", "PENDING").set("attempts", 0)
                            .set("recipient", booking.getCustomerEmail()).set("nextAttemptAt", LocalDateTime.now()), EmailJob.class);
        return status(booking);
    }

    @Scheduled(fixedDelayString = "${payment.email.scan-ms:15000}")
    public void deliverPending() {
        if (!enabled) return;
        LocalDateTime now = LocalDateTime.now();
        mongo.updateMulti(Query.query(Criteria.where("status").is("SENDING").and("leaseUntil").lte(now).and("attempts").gte(5)),
                new Update().set("status", "FAILED").set("lastError", "DELIVERY_UNCERTAIN"), EmailJob.class);
        Criteria ready = new Criteria().orOperator(
                Criteria.where("status").in("PENDING", "RETRY").and("nextAttemptAt").lte(now),
                Criteria.where("status").is("SENDING").and("leaseUntil").lte(now));
        for (EmailJob pending : mongo.find(Query.query(ready).limit(30), EmailJob.class)) {
            try { deliver(pending.getId(), now); }
            catch (RuntimeException ex) {
                org.slf4j.LoggerFactory.getLogger(getClass()).warn("Email job {} deferred", pending.getId());
            }
        }
    }

    private void deliver(String id, LocalDateTime now) {
        String lease = UUID.randomUUID().toString();
        Criteria eligible = Criteria.where("_id").is(id).and("attempts").lt(5).orOperator(
                Criteria.where("status").in("PENDING", "RETRY").and("nextAttemptAt").lte(now),
                Criteria.where("status").is("SENDING").and("leaseUntil").lte(now));
        EmailJob job = mongo.findAndModify(Query.query(eligible), new Update().set("status", "SENDING")
                        .set("leaseToken", lease).set("leaseUntil", now.plusMinutes(2)).inc("attempts", 1),
                FindAndModifyOptions.options().returnNew(true), EmailJob.class);
        if (job == null) return;
        Query ownedLease = Query.query(Criteria.where("_id").is(id).and("leaseToken").is(lease).and("status").is("SENDING"));
        try {
            Booking booking = mongo.findById(job.getBookingId(), Booking.class);
            if (booking == null) throw new IllegalStateException("Booking not found");
            var message = mail.createMimeMessage();
            var helper = new MimeMessageHelper(message, true, "UTF-8");
            if (sender != null && !sender.isBlank()) helper.setFrom(sender);
            helper.setTo(job.getRecipient());
            message.setHeader("X-CinemaHub-Delivery-ID", job.getId());
            if ("TICKET".equals(job.getKind())) {
                Ticket ticket;
                try { ticket = paidTicket(booking); }
                catch (ResponseStatusException unavailable) {
                    mongo.updateFirst(ownedLease, new Update().set("status", "CANCELLED"), EmailJob.class);
                    return;
                }
                helper.setSubject("[CinemaHub] Vé điện tử " + booking.getBookingReference());
                String seats = booking.getSeats().stream().map(Booking.BookedSeat::getSeatNumber)
                        .collect(java.util.stream.Collectors.joining(", "));
                String text = "Mã đặt vé: " + booking.getBookingReference() + "\nPhim: " + booking.getMovieTitle()
                        + "\nRạp: " + booking.getCinemaName() + " - " + booking.getRoomName()
                        + "\nSuất chiếu: " + booking.getShowtimeStart() + "\nGhế: " + seats
                        + "\nSố tiền: " + booking.getPayment().getAmount() + " VND\nGiữ kín mã QR đính kèm.";
                helper.setText(text, "<pre>" + HtmlUtils.htmlEscape(text) + "</pre><img alt='QR vé' src='cid:ticket-qr'>");
                byte[] png = qr.png(ticket.getQrCode());
                helper.addInline("ticket-qr", new ByteArrayResource(png), "image/png");
                helper.addAttachment("CinemaHub-ticket-QR.png", new ByteArrayResource(png), "image/png");
            } else {
                if (booking.getRefund() == null || !job.getKind().equals("REFUND_" + booking.getRefund().getStatus()))
                    throw new IllegalStateException("Refund changed");
                helper.setSubject("[CinemaHub] Kết quả yêu cầu hoàn tiền " + booking.getBookingReference());
                helper.setText("Mã đặt vé: " + booking.getBookingReference() + "\nTrạng thái: "
                        + booking.getRefund().getStatus() + "\nSố tiền: " + booking.getRefund().getAmount()
                        + " VND\nLý do xử lý: " + Objects.toString(booking.getRefund().getDecisionReason(), ""));
            }
            mail.send(message);
            mongo.updateFirst(ownedLease, new Update().set("status", "SENT").set("sentAt", LocalDateTime.now())
                    .unset("lastError").unset("leaseUntil"), EmailJob.class);
        } catch (Exception ex) {
            mongo.updateFirst(ownedLease, new Update().set("status", job.getAttempts() >= 5 ? "FAILED" : "RETRY")
                    .set("lastError", "SMTP_DELIVERY_FAILED").set("nextAttemptAt", now.plusMinutes(job.getAttempts() * 2L))
                    .unset("leaseUntil"), EmailJob.class);
        }
    }

    private boolean validEmail(String email) {
        try {
            if (email == null || email.isBlank() || email.contains("\n") || email.contains("\r")) return false;
            InternetAddress address = new InternetAddress(email, true);
            address.validate();
            return address.getAddress().equals(email) && email.contains("@");
        } catch (Exception ex) { return false; }
    }
}
