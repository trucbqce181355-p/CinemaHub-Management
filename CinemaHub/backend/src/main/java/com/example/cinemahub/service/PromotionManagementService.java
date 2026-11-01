package com.example.cinemahub.service;

import com.example.cinemahub.model.*;
import com.example.cinemahub.repository.*;
import lombok.RequiredArgsConstructor;
import org.bson.Document;
import org.springframework.stereotype.Service;
import org.springframework.data.mongodb.core.*;
import org.springframework.data.mongodb.core.index.*;
import org.springframework.data.mongodb.core.query.*;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;

@Service
@RequiredArgsConstructor
public class PromotionManagementService {
    private final PromotionRepository promotions;
    private final PricingRuleRepository pricing;
    private final MongoTemplate mongo;
    private final AdmissionCoordinator admission;
    private boolean indexed;

    private synchronized void ensureUniqueCode() {
        if (indexed) return;
        if (promotions.findAll().stream().anyMatch(p -> p.getCode() != null && !p.getCode().equals(p.getCode().trim())))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Dữ liệu cũ có mã chứa khoảng trắng. Vui lòng chuẩn hóa trước khi lưu");
        try {
            mongo.indexOps(Promotion.class).ensureIndex(new Index().on("code", Sort.Direction.ASC)
                    .named("promotion_code_unique_ci").unique()
                    .collation(Collation.of("en").strength(Collation.ComparisonLevel.secondary()))
                    .partial(PartialIndexFilter.of(new Document("code", new Document("$type", "string")))));
            indexed = true;
        } catch (org.springframework.dao.DataAccessException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Chưa thể bảo đảm mã duy nhất. Kiểm tra mã trùng trong dữ liệu hiện có trước khi lưu.");
        }
    }
    public Promotion create(Promotion p) {
        return admission.write(() -> {
            PromotionRules.validate(p); ensureUniqueCode(); p.setId(null); p.setVersion(0L);
            return promotions.insert(p);
        });
    }
    public Promotion update(String id, Promotion p) {
        return admission.write(() -> {
            Promotion old = promotions.findById(id).orElseThrow(this::notFound);
            PromotionRules.validate(p);
            if (!Objects.equals(PromotionRules.code(old.getCode()), p.getCode())
                    && ("Active".equals(old.getStatus()) || mongo.exists(Query.query(Criteria.where("promoCode").is(old.getCode())).collation(Collation.of("en").strength(Collation.ComparisonLevel.secondary())), Booking.class)))
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Không thể đổi mã đang Active hoặc đã có lịch sử đặt vé");
            ensureUniqueCode();
            return replace(id, p.getVersion(), p, Promotion.class,
                    List.of("code", "title", "description", "discountType", "discountValue", "startDate", "endDate", "status", "conditions", "bannerImage"));
        });
    }
    public Promotion disable(String id, Long version) {
        return admission.write(() -> {
            promotions.findById(id).orElseThrow(this::notFound);
            Promotion updated = mongo.findAndModify(version(id, version), new Update().set("status", "Disabled").set("version", version == null ? 1L : version + 1),
                    FindAndModifyOptions.options().returnNew(true), Promotion.class);
            if (updated == null) throw changed(); return updated;
        });
    }
    public PricingRule create(PricingRule r) {
        return admission.write(() -> { DynamicPricingService.validate(r); r.setId(null); r.setVersion(0L); return pricing.insert(r); });
    }
    public PricingRule update(String id, PricingRule r) {
        return admission.write(() -> {
            pricing.findById(id).orElseThrow(this::notFound); DynamicPricingService.validate(r);
            return replace(id, r.getVersion(), r, PricingRule.class, List.of("triggerVariable", "conditionParams", "adjustmentValue", "status"));
        });
    }
    public PricingRule disableRule(String id, Long revision) {
        return admission.write(() -> {
            pricing.findById(id).orElseThrow(this::notFound);
            PricingRule r = mongo.findAndModify(version(id, revision), new Update().set("status", "Disabled").set("version", revision == null ? 1L : revision + 1),
                    FindAndModifyOptions.options().returnNew(true), PricingRule.class);
            if (r == null) throw changed(); return r;
        });
    }
    private Query version(String id, Long version) { return Query.query(Criteria.where("_id").is(id).and("version").is(version)); }
    private <T> T replace(String id, Long revision, T value, Class<T> type, List<String> fields) {
        Document doc = new Document(); mongo.getConverter().write(value, doc);
        Update update = new Update().set("version", revision == null ? 1L : revision + 1);
        fields.forEach(field -> update.set(field, doc.get(field)));
        T result = mongo.findAndModify(version(id, revision), update, FindAndModifyOptions.options().returnNew(true), type);
        if (result == null) throw changed(); return result;
    }
    private ResponseStatusException notFound() { return new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy chương trình"); }
    private ResponseStatusException changed() { return new ResponseStatusException(HttpStatus.CONFLICT, "Dữ liệu đã thay đổi. Vui lòng tải lại trước khi lưu"); }
}
