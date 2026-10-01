package com.example.cinemahub.repository;

import com.example.cinemahub.model.Booking;
import com.example.cinemahub.model.Payment;
import lombok.RequiredArgsConstructor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;

@Repository
@RequiredArgsConstructor
public class PaymentRepository {
    private final MongoTemplate mongo;

    public Booking find(String id) { return mongo.findById(id, Booking.class); }

    public Booking findTransaction(String transactionId) {
        return mongo.findOne(Query.query(Criteria.where("payment.transactionId").is(transactionId)), Booking.class);
    }

    public Booking initiate(Booking snapshot, Payment payment, LocalDateTime now) {
        // The version guard also excludes concurrent promo/cancellation changes.
        Criteria guard = Criteria.where("_id").is(snapshot.getId()).and("userId").is(snapshot.getUserId())
                .and("version").is(snapshot.getVersion()).and("status").is("PENDING")
                .and("holdExpiresAt").gt(now).and("payment").is(null);
        return change(guard, new Update().set("payment", payment).set("paymentMethod", "VNPAY")
                .set("customerName", snapshot.getCustomerName()).set("customerEmail", snapshot.getCustomerEmail())
                .set("customerPhone", snapshot.getCustomerPhone()), now);
    }

    public Booking complete(String transactionId, boolean success, String providerId, String code, LocalDateTime now) {
        Criteria guard = Criteria.where("payment.transactionId").is(transactionId)
                .and("payment.status").is("PENDING").and("status").is("PENDING").and("holdExpiresAt").gt(now);
        return change(guard, new Update().set("status", success ? "CONFIRMED" : "CANCELLED")
                .set("payment.status", success ? "SUCCESS" : "FAILED")
                .set("payment.providerTransactionId", providerId).set("payment.responseCode", code)
                .set("payment.updatedAt", now), now);
    }

    public boolean expire(String id, LocalDateTime now) {
        Criteria guard = Criteria.where("_id").is(id).and("status").is("PENDING").and("holdExpiresAt").lte(now);
        Booking booking = find(id);
        if (booking == null) return false;
        Update update = new Update().set("status", "EXPIRED");
        if (booking.getPayment() != null) {
            guard.and("payment.status").is("PENDING");
            update.set("payment.status", "EXPIRED").set("payment.updatedAt", now);
        } else guard.and("payment").is(null);
        return change(guard, update, now) != null;
    }

    public List<Booking> expired(LocalDateTime now) {
        return mongo.find(Query.query(Criteria.where("status").is("PENDING").and("holdExpiresAt").lte(now))
                .with(org.springframework.data.domain.Sort.by("holdExpiresAt")).limit(100), Booking.class);
    }

    public void flagReconciliation(String id, String providerId, LocalDateTime now) {
        change(Criteria.where("_id").is(id).and("payment.status").in("EXPIRED", "FAILED"),
                new Update().set("payment.reconciliationRequired", true)
                        .set("payment.providerTransactionId", providerId), now);
    }

    public List<Booking> unissued() {
        return mongo.find(Query.query(Criteria.where("payment.status").is("SUCCESS")
                .and("status").is("CONFIRMED").and("ticketId").is(null)).limit(100), Booking.class);
    }

    private Booking change(Criteria guard, Update update, LocalDateTime now) {
        return mongo.findAndModify(Query.query(guard), update.set("updatedAt", now).inc("version", 1),
                FindAndModifyOptions.options().returnNew(true), Booking.class);
    }
}
