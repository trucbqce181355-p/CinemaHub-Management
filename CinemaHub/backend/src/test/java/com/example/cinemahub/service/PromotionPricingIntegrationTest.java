package com.example.cinemahub.service;

import com.example.cinemahub.dto.*;
import com.example.cinemahub.model.*;
import com.example.cinemahub.repository.*;
import com.mongodb.client.*;
import org.junit.jupiter.api.*;
import org.springframework.data.mongodb.core.*;
import org.springframework.data.mongodb.repository.support.MongoRepositoryFactory;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;

/** Unique disposable database. Never uses the application's cinema database. */
class PromotionPricingIntegrationTest {
    MongoClient client; MongoTemplate mongo; PromotionRepository promos; PricingRuleRepository rules;
    PromotionManagementService management; PromotionValidationService validation; BookingService bookings;
    AdmissionCoordinator admission; Showtime show; Movie movie;
    @BeforeEach void setup() {
        client = MongoClients.create("mongodb://127.0.0.1:27017/?serverSelectionTimeoutMS=3000");
        mongo = new MongoTemplate(client, "promotion_test_" + UUID.randomUUID().toString().replace("-", ""));
        var factory = new MongoRepositoryFactory(mongo); promos = factory.getRepository(PromotionRepository.class);
        rules = factory.getRepository(PricingRuleRepository.class); admission = new AdmissionCoordinator();
        management = new PromotionManagementService(promos, rules, mongo, admission);
        validation = new PromotionValidationService();
        ReflectionTestUtils.setField(validation, "promotionRepository", promos); ReflectionTestUtils.setField(validation, "mongo", mongo);
        bookings = new BookingService();
        ReflectionTestUtils.setField(bookings, "admission", admission); ReflectionTestUtils.setField(bookings, "mongo", mongo);
        ReflectionTestUtils.setField(bookings, "showtimeRepository", factory.getRepository(ShowtimeRepository.class));
        ReflectionTestUtils.setField(bookings, "seatRepository", factory.getRepository(SeatRepository.class));
        ReflectionTestUtils.setField(bookings, "movieRepository", factory.getRepository(MovieRepository.class));
        ReflectionTestUtils.setField(bookings, "bookingRepository", factory.getRepository(BookingRepository.class));
        ReflectionTestUtils.setField(bookings, "ticketRepository", factory.getRepository(TicketRepository.class));
        ReflectionTestUtils.setField(bookings, "emailService", org.mockito.Mockito.mock(EmailService.class));
        ReflectionTestUtils.setField(bookings, "membershipService", org.mockito.Mockito.mock(MembershipService.class));
        ReflectionTestUtils.setField(bookings, "promotionValidationService", validation);
        ReflectionTestUtils.setField(bookings, "dynamicPricingService", new DynamicPricingService(rules));
        Cinema cinema = new Cinema(); cinema.setId("cinema"); cinema.setStatus("Active"); mongo.insert(cinema);
        ScreenRoom room = new ScreenRoom(); room.setId("room"); room.setCinemaId("cinema"); room.setStatus("Active"); mongo.insert(room);
        movie = new Movie(); movie.setStandardPrice(100001d); movie = mongo.insert(movie);
        show = new Showtime(); show.setMovieId(movie.getId()); show.setRoomId("room"); show.setCinemaId("cinema");
        show.setStartTime(LocalDateTime.of(2030, 1, 5, 23, 0)); show.setEndTime(show.getStartTime().plusHours(2)); show = mongo.insert(show);
        Seat seat = new Seat(); seat.setRoomId("room"); seat.setSeatNumber("A1"); seat.setSeatType("STANDARD"); seat.setStatus("ACTIVE"); mongo.insert(seat);
    }
    @AfterEach void cleanup() {
        if (mongo != null && mongo.getDb().getName().startsWith("promotion_test_")) mongo.getDb().drop();
        if (client != null) client.close();
    }
    Promotion promo() {
        Promotion p = new Promotion(); p.setCode("TEST"); p.setTitle("Test"); p.setDiscountType("Fixed"); p.setDiscountValue(10000d);
        p.setStatus("Active"); p.setStartDate(LocalDateTime.now().minusDays(1)); p.setEndDate(LocalDateTime.now().plusDays(1)); return p;
    }
    PricingRule rule(String trigger, double amount, Map<String,Object> conditions) {
        PricingRule r = new PricingRule(); r.setTriggerVariable(trigger); r.setAdjustmentValue(amount); r.setStatus("Active"); r.setConditionParams(conditions); return r;
    }
    CalculatePriceRequest request(String... seats) { var r = new CalculatePriceRequest(); r.setShowtimeId(show.getId()); r.setSeatIds(List.of(seats)); return r; }
    Booking held(String owner) {
        return mongo.insert(Booking.builder().userId(owner).status("PENDING").subtotal(100001d).totalAmount(100001d)
                .holdExpiresAt(LocalDateTime.now().plusMinutes(10)).build());
    }
    ApplyPromoRequest apply(Booking b) { var r = new ApplyPromoRequest(); r.setBookingId(b.getId()); r.setSubtotal(1d); r.setCode("TEST"); return r; }
    @Test void uniqueCodeIndexRejectsCaseInsensitiveDuplicatesAndClientIdCannotOverwrite() {
        Promotion p = management.create(promo()); Promotion copy = promo(); copy.setCode(" test "); copy.setId(p.getId());
        assertThrows(org.springframework.dao.DuplicateKeyException.class, () -> management.create(copy)); assertEquals(1, promos.count());
    }
    @Test void percentSymbolWorksThroughCreateLookupAndApply() {
        Promotion p = promo(); p.setCode(" giam10% ");
        Promotion created = management.create(p);
        assertEquals("GIAM10%", created.getCode());
        assertEquals(created.getId(), validation.validateCode("giam10%").getId());
        Booking b = held("owner"); var req = apply(b); req.setCode("giam10%");
        assertEquals(90001d, bookings.applyPromo(req).getNewTotal());
        assertEquals("GIAM10%", mongo.findById(b.getId(), Booking.class).getPromoCode());
    }
    @Test void softDeleteHidesDisabledPromotionButKeepsHistoryAndCodeReservation() {
        Promotion p = management.create(promo());
        mongo.insert(Booking.builder().promoCode("TEST").status("CONFIRMED").build());
        assertThrows(ResponseStatusException.class, () -> management.archive(p.getId(), p.getVersion()));
        Promotion disabled = management.disable(p.getId(), p.getVersion());
        assertEquals(1, promos.findVisiblePromotions().size());
        assertThrows(ResponseStatusException.class, () -> management.archive(disabled.getId(), 0L));
        Promotion archived = management.archive(disabled.getId(), disabled.getVersion());
        assertTrue(archived.isArchived()); assertEquals("Disabled", archived.getStatus());
        assertTrue(promos.findVisiblePromotions().isEmpty()); assertEquals(1, promos.count());
        assertEquals(1, mongo.count(new org.springframework.data.mongodb.core.query.Query(), Booking.class));
        assertThrows(IllegalArgumentException.class, () -> validation.validateCode("TEST"));
        assertThrows(ResponseStatusException.class, () -> management.update(archived.getId(), archived));
        assertThrows(ResponseStatusException.class, () -> management.disable(archived.getId(), archived.getVersion()));
        assertThrows(org.springframework.dao.DuplicateKeyException.class, () -> management.create(promo()));
    }
    @Test void legacyRowsRemainVisibleAndArchivedRowsCannotAppearInPublicList() {
        Promotion p = management.create(promo());
        mongo.updateFirst(org.springframework.data.mongodb.core.query.Query.query(
                org.springframework.data.mongodb.core.query.Criteria.where("_id").is(p.getId())),
                new org.springframework.data.mongodb.core.query.Update().unset("archived"), Promotion.class);
        assertEquals(1, promos.findVisiblePromotions().size());
        Promotion disabled = management.disable(p.getId(), p.getVersion());
        Promotion archived = management.archive(disabled.getId(), disabled.getVersion());
        archived.setStatus("Active"); promos.save(archived);
        assertTrue(promos.findActivePromotions(LocalDateTime.now()).isEmpty());
        assertThrows(IllegalArgumentException.class, () -> validation.validateCode("TEST"));
    }
    @Test void invalidRulesAndPromotionsCannotBeSaved() {
        for (double n : new double[]{-1, 101, Double.NaN}) { Promotion p = promo(); p.setDiscountType("Percentage"); p.setDiscountValue(n); assertThrows(IllegalArgumentException.class, () -> management.create(p)); }
        Promotion p = promo(); p.setEndDate(p.getStartDate()); assertThrows(IllegalArgumentException.class, () -> management.create(p));
        assertThrows(IllegalArgumentException.class, () -> management.create(rule("UNKNOWN", 10, Map.of())));
        assertThrows(IllegalArgumentException.class, () -> management.create(rule("HOLIDAY", 10, Map.of())));
        assertThrows(IllegalArgumentException.class, () -> management.create(rule("WEEKEND", Double.NaN, Map.of())));
    }
    @Test void optimisticUpdatesAndDisablePreserveHistory() {
        Promotion p = management.create(promo()); Promotion stale = promo(); stale.setVersion(0L);
        p.setTitle("Changed"); Promotion saved = management.update(p.getId(), p); assertEquals(1L, saved.getVersion());
        assertThrows(ResponseStatusException.class, () -> management.update(p.getId(), stale));
        assertThrows(ResponseStatusException.class, () -> management.disable(p.getId(), 0L));
        management.disable(p.getId(), 1L); assertEquals("Disabled", promos.findById(p.getId()).orElseThrow().getStatus()); assertEquals(1, promos.count());
    }
    @Test void activeUnusedCodeCanBeRenamedWithoutDisabling() {
        Promotion p = management.create(promo()); p.setCode("new10%");
        Promotion saved = management.update(p.getId(), p);
        assertEquals("NEW10%", saved.getCode()); assertEquals("Active", saved.getStatus());
        assertEquals(p.getId(), validation.validateCode("NEW10%").getId());
        assertThrows(IllegalArgumentException.class, () -> validation.validateCode("TEST"));
    }
    @Test void historicalCodeIsProtectedRegardlessOfStatus() {
        Promotion p = management.create(promo());
        mongo.insert(Booking.builder().promoCode("test").status("CONFIRMED").build());
        p.setCode("NEW"); assertThrows(ResponseStatusException.class, () -> management.update(p.getId(), p));
        Promotion disabled = management.disable(p.getId(), p.getVersion());
        disabled.setCode("NEW"); assertThrows(ResponseStatusException.class, () -> management.update(disabled.getId(), disabled));
    }
    @Test void legacyDocumentWithoutVersionCanBeEdited() {
        Promotion p = promos.insert(promo()); assertNull(p.getVersion()); p.setTitle("Legacy updated");
        assertEquals(1L, management.update(p.getId(), p).getVersion());
    }
    @Test void quoteRejectsFakeDuplicateAndDisabledSeats() {
        assertThrows(IllegalArgumentException.class, () -> bookings.calculatePrice(request("FAKE")));
        assertThrows(IllegalArgumentException.class, () -> bookings.calculatePrice(request("A1", "A1")));
        mongo.updateMulti(new org.springframework.data.mongodb.core.query.Query(), new org.springframework.data.mongodb.core.query.Update().set("status", "Disabled"), Seat.class);
        assertThrows(IllegalArgumentException.class, () -> bookings.calculatePrice(request("A1")));
    }
    @Test void percentageRoundsWholeVndAndMinimumSpendIsShared() {
        Promotion p = promo(); p.setDiscountType("Percentage"); p.setDiscountValue(15d); management.create(p);
        var req = request("A1"); req.setPromoCode(" test "); assertEquals(85001d, bookings.calculatePrice(req, "owner").getTotalAmount());
        Promotion persisted = promos.findByCode("TEST").orElseThrow(); persisted.setConditions(Map.of("minSpend", 500000)); management.update(persisted.getId(), persisted);
        assertThrows(IllegalArgumentException.class, () -> bookings.calculatePrice(req, "owner"));
        Booking b = held("owner"); assertThrows(IllegalArgumentException.class, () -> bookings.applyPromo(apply(b)));
    }
    @Test void applyUsesStoredSubtotalAndClearRestoresServerPrice() {
        management.create(promo()); Booking b = held("owner"); assertEquals(90001d, bookings.applyPromo(apply(b)).getNewTotal());
        assertEquals(100001d, bookings.clearPromo(b.getId()).get("totalAmount")); assertNull(mongo.findById(b.getId(), Booking.class).getPromoCode());
    }
    @Test void quotaHoldsLastSlotUntilCancellationAndReapplyDoesNotCountItself() {
        Promotion p = promo(); p.setConditions(Map.of("usageLimit", 1)); management.create(p);
        Booking a = held("a"), b = held("b"); bookings.applyPromo(apply(a)); bookings.applyPromo(apply(a));
        assertThrows(IllegalArgumentException.class, () -> bookings.applyPromo(apply(b)));
        bookings.clearPromo(a.getId()); assertDoesNotThrow(() -> bookings.applyPromo(apply(b)));
    }
    @Test void concurrentPromoClaimsHaveOneWinnerOnThisBackend() throws Exception {
        Promotion p = promo(); p.setConditions(Map.of("usageLimit", 1)); management.create(p);
        var a = apply(held("a")); var b = apply(held("b")); ExecutorService pool = Executors.newFixedThreadPool(2);
        try { var futures = pool.invokeAll(List.<Callable<Boolean>>of(() -> attempt(a), () -> attempt(b)));
            assertEquals(1, futures.stream().filter(f -> {try{return f.get();}catch(Exception e){throw new RuntimeException(e);}}).count());
        } finally { pool.shutdownNow(); }
    }
    boolean attempt(ApplyPromoRequest r) { try {bookings.applyPromo(r);return true;}catch(IllegalArgumentException e){return false;} }
    @Test void perUserLimitsOwnerAndMalformedConditionsAreEnforced() {
        Promotion p = promo(); p.setConditions(Map.of("perUserLimit", 1, "redeemedByUserId", "owner")); management.create(p);
        assertThrows(IllegalArgumentException.class, () -> bookings.applyPromo(apply(held("other"))));
        bookings.applyPromo(apply(held("owner"))); assertThrows(IllegalArgumentException.class, () -> bookings.applyPromo(apply(held("owner"))));
        Promotion bad = promo(); bad.setConditions(Map.of("usageLimit", 1.5)); assertThrows(IllegalArgumentException.class, () -> PromotionRules.validate(bad));
    }
    @Test void expiredHoldsReleaseQuotaButConfirmedBookingsConsumeIt() {
        Promotion p = promo(); p.setConditions(Map.of("usageLimit", 1)); management.create(p);
        mongo.insert(Booking.builder().promoCode("test").status("PENDING").holdExpiresAt(LocalDateTime.now().minusMinutes(1)).build());
        assertDoesNotThrow(() -> bookings.applyPromo(apply(held("owner"))));
    }
    @Test void dynamicRulesStackAcrossQuoteAndHoldAndRespectBounds() {
        management.create(rule("WEEKEND", 20000, Map.of())); management.create(rule("LATE_NIGHT", -10000, Map.of("startHour",22)));
        var quote = bookings.calculatePrice(request("A1")); assertEquals(110001d, quote.getTotalAmount());
        HoldSeatRequest hold = new HoldSeatRequest(); hold.setShowtimeId(show.getId()); hold.setSeatIds(List.of("A1"));
        assertEquals(110001d, bookings.holdSeats(hold,"owner").getSubtotal());
        PricingRule r = management.create(rule("WEEKEND", -1000000, Map.of())); assertEquals(1000d, bookings.calculatePrice(request("A1")).getTotalAmount());
        management.disableRule(r.getId(), r.getVersion()); assertEquals(110001d, bookings.calculatePrice(request("A1")).getTotalAmount());
    }
    @Test void pricingCrudPreservesHeldPricesAndArchivesOnlyDisabledRules() {
        PricingRule r = management.create(rule("WEEKEND", 20000, Map.of()));
        assertEquals(0L, r.getVersion()); assertFalse(r.isArchived());
        assertEquals(1, rules.findVisibleRules().size()); assertEquals(120001d, bookings.calculatePrice(request("A1")).getTotalAmount());
        HoldSeatRequest hold = new HoldSeatRequest(); hold.setShowtimeId(show.getId()); hold.setSeatIds(List.of("A1"));
        Booking savedHold = bookings.holdSeats(hold, "owner");
        assertThrows(ResponseStatusException.class, () -> management.archiveRule(r.getId(), r.getVersion()));
        r.setAdjustmentValue(30000d); PricingRule updated = management.update(r.getId(), r);
        assertEquals(1L, updated.getVersion()); assertEquals(130001d, bookings.calculatePrice(request("A1")).getTotalAmount());
        assertEquals(120001d, mongo.findById(savedHold.getId(), Booking.class).getSubtotal());
        assertThrows(ResponseStatusException.class, () -> management.update(r.getId(), r));
        assertThrows(ResponseStatusException.class, () -> management.disableRule(r.getId(), 0L));
        PricingRule disabled = management.disableRule(r.getId(), updated.getVersion());
        assertEquals("Disabled", disabled.getStatus()); assertEquals(100001d, bookings.calculatePrice(request("A1")).getTotalAmount());
        assertEquals(1, rules.findVisibleRules().size());
        assertThrows(ResponseStatusException.class, () -> management.archiveRule(r.getId(), 1L));
        PricingRule archived = management.archiveRule(r.getId(), disabled.getVersion());
        assertTrue(archived.isArchived()); assertEquals(1, rules.count()); assertTrue(rules.findVisibleRules().isEmpty());
        assertThrows(ResponseStatusException.class, () -> management.update(r.getId(), archived));
        assertThrows(ResponseStatusException.class, () -> management.disableRule(r.getId(), archived.getVersion()));
        assertEquals(120001d, mongo.findById(savedHold.getId(), Booking.class).getTotalAmount());
    }
    @Test void legacyPricingRowsAreVisibleAndArchivedRulesNeverAffectPrice() {
        PricingRule r = rules.insert(rule("WEEKEND", 20000, Map.of()));
        mongo.updateFirst(org.springframework.data.mongodb.core.query.Query.query(
                org.springframework.data.mongodb.core.query.Criteria.where("_id").is(r.getId())),
                new org.springframework.data.mongodb.core.query.Update().unset("archived"), PricingRule.class);
        assertEquals(1, rules.findVisibleRules().size()); assertEquals(120001d, bookings.calculatePrice(request("A1")).getTotalAmount());
        PricingRule disabled = management.disableRule(r.getId(), null);
        PricingRule archived = management.archiveRule(r.getId(), disabled.getVersion());
        archived.setStatus("Active"); rules.save(archived);
        assertTrue(rules.findApplicableRules().isEmpty()); assertEquals(100001d, bookings.calculatePrice(request("A1")).getTotalAmount());
        assertEquals(100001d, new DynamicPricingService(rules).price(show,100001d,List.of(archived)));
    }
    @Test void sneakRulesCannotReferenceMissingShowtimes() {
        assertThrows(IllegalArgumentException.class, () -> management.create(rule("SNEAK_SHOW", 10000, Map.of("showtimeIds", List.of("missing")))));
        PricingRule r = management.create(rule("SNEAK_SHOW", 10000, Map.of("showtimeIds", List.of(show.getId()))));
        r.setConditionParams(Map.of("showtimeIds", List.of("missing")));
        assertThrows(IllegalArgumentException.class, () -> management.update(r.getId(), r));
        assertEquals(1, rules.count());
    }
    @Test void holidayAndSneakRulesUseExplicitDatesAndScreeningIds() {
        management.create(rule("HOLIDAY", 5000, Map.of("dates", List.of("2030-01-05"))));
        management.create(rule("SNEAK_SHOW", 7000, Map.of("showtimeIds", List.of(show.getId()))));
        assertEquals(112001d, bookings.calculatePrice(request("A1")).getTotalAmount());
    }
    @Test void counterSaleUsesSamePriceAndRejectsMinSpendBypass() {
        Promotion p = promo(); p.setConditions(Map.of("minSpend", 500000)); p = management.create(p);
        var req = new CounterBookingRequest(); req.setShowtimeId(show.getId()); req.setSeatIds(List.of("A1"));
        req.setCustomerName("Customer"); req.setPaymentMethod("CASH"); req.setPromoCode("TEST");
        assertThrows(IllegalArgumentException.class, () -> bookings.createCounterBooking(req,"staff"));
        assertEquals(0, mongo.count(new org.springframework.data.mongodb.core.query.Query(), Ticket.class));
        p.setConditions(Map.of("minSpend", 100000)); management.update(p.getId(),p);
        management.create(rule("WEEKEND",20000,Map.of()));
        var result = bookings.createCounterBooking(req,"staff"); Booking b = (Booking)result.get("booking");
        assertEquals(120001d,b.getSubtotal()); assertEquals(110001d,b.getTotalAmount()); assertEquals("CONFIRMED",b.getStatus());
    }
    @Test void onlineFreeOrderIsRejectedBeforeWritingAnUnpayableDiscount() {
        Promotion p=promo();p.setDiscountType("Percentage");p.setDiscountValue(100d);management.create(p);
        Booking b=held("owner");assertThrows(IllegalArgumentException.class,()->bookings.applyPromo(apply(b)));
        assertNull(mongo.findById(b.getId(),Booking.class).getPromoCode());
    }
    @Test void promotionIsRevalidatedBeforePayment() {
        Promotion p = management.create(promo()); Booking b = held("owner"); bookings.applyPromo(apply(b));
        Booking saved = mongo.findById(b.getId(), Booking.class); assertDoesNotThrow(() -> bookings.validatePaymentPromotion(saved));
        management.disable(p.getId(), p.getVersion()); assertThrows(IllegalArgumentException.class, () -> bookings.validatePaymentPromotion(saved));
    }
}
