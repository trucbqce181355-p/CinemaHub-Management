package com.example.cinemahub.service;

import com.example.cinemahub.exception.TicketCheckInException;
import com.example.cinemahub.controller.TicketController;
import com.example.cinemahub.model.*;
import com.example.cinemahub.dto.CounterBookingRequest;
import com.example.cinemahub.repository.*;
import java.math.BigDecimal;
import com.example.cinemahub.repository.ShowtimeRepository;
import com.example.cinemahub.repository.TicketRepository;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import org.junit.jupiter.api.*;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.repository.support.MongoRepositoryFactory;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class TicketCheckInIntegrationTest {
    MongoClient client;
    MongoTemplate mongo;
    TicketRepository tickets;
    ShowtimeRepository showtimes;
    TicketValidationService service;
    AdmissionCoordinator admission;
    BookingService bookings;
    final LocalDateTime now = LocalDateTime.of(2026, 10, 20, 19, 0);

    @BeforeEach void setup() {
        client = MongoClients.create("mongodb://127.0.0.1:27017/?serverSelectionTimeoutMS=3000");
        mongo = new MongoTemplate(client, "ticket_scan_test_" + UUID.randomUUID().toString().replace("-", ""));
        MongoRepositoryFactory factory = new MongoRepositoryFactory(mongo);
        tickets = factory.getRepository(TicketRepository.class);
        showtimes = factory.getRepository(ShowtimeRepository.class);
        admission = new AdmissionCoordinator();
        service = new TicketValidationService(tickets, showtimes, mongo, admission);
        bookings = new BookingService();
        ReflectionTestUtils.setField(bookings, "admission", admission);
        ReflectionTestUtils.setField(bookings, "mongo", mongo);
        ReflectionTestUtils.setField(bookings, "bookingRepository", factory.getRepository(BookingRepository.class));
        ReflectionTestUtils.setField(bookings, "ticketRepository", tickets);
        ReflectionTestUtils.setField(bookings, "showtimeRepository", showtimes);
        ReflectionTestUtils.setField(bookings, "seatRepository", factory.getRepository(SeatRepository.class));
        ReflectionTestUtils.setField(bookings, "movieRepository", factory.getRepository(MovieRepository.class));
        ReflectionTestUtils.setField(service, "clock", Clock.fixed(
                now.atZone(ZoneId.systemDefault()).toInstant(), ZoneId.systemDefault()));
    }

    @AfterEach void cleanup() {
        if (mongo != null && mongo.getDb().getName().startsWith("ticket_scan_test_")) mongo.getDb().drop();
        if (client != null) client.close();
    }

    Ticket ticket(boolean counter) {
        Cinema cinema = new Cinema(); cinema.setStatus("Active"); cinema = mongo.save(cinema);
        ScreenRoom room = new ScreenRoom(); room.setCinemaId(cinema.getId()); room.setStatus("Active"); room = mongo.save(room);
        Movie movie = mongo.save(new Movie());
        for (String number : List.of("A1", "A2")) {
            Seat seat = new Seat(); seat.setRoomId(room.getId()); seat.setSeatNumber(number);
            seat.setStatus("ACTIVE"); seat.setSeatType("STANDARD"); mongo.save(seat);
        }
        Showtime s = new Showtime();
        s.setCinemaId(cinema.getId()); s.setRoomId(room.getId()); s.setMovieId(movie.getId());
        s.setStartTime(now.plusMinutes(10));
        s.setEndTime(now.plusHours(2));
        s.setStatus("Active");
        s = showtimes.save(s);
        Ticket t = new Ticket();
        t.setCreatedAt(now); // MongoDB persists millisecond precision; keep round-trip fixtures deterministic.
        if (!counter) t.setId("PAY-" + UUID.randomUUID());
        t.setBookingReference("CH-261020-ABCD");
        t.setShowtimeId(s.getId());
        t.setRoomId(room.getId()); t.setCinemaId(cinema.getId());
        t.setShowtimeStart(s.getStartTime());
        t.setStatus("Paid");
        t.setQrCode("CINEMAHUB|" + (counter ? "COUNTER|" : "") + t.getBookingReference() + "|" + UUID.randomUUID());
        t.setSeats(new ArrayList<>(List.of(new Ticket.SeatStatus("A1", "A1", "Unused"),
                new Ticket.SeatStatus("A2", "A2", "Unused"))));
        t = tickets.save(t);
        Payment payment = new Payment(); payment.setTransactionId("txn-" + UUID.randomUUID());
        payment.setStatus("SUCCESS"); payment.setAmount(BigDecimal.valueOf(180000));
        Booking b = Booking.builder().bookingReference(t.getBookingReference()).ticketId(t.getId())
                .showtimeId(s.getId()).movieId(movie.getId()).roomId(room.getId()).cinemaId(cinema.getId())
                .showtimeStart(s.getStartTime()).bookingType(counter ? "COUNTER" : "ONLINE")
                .paymentMethod(counter ? "CASH" : "VNPAY").status("CONFIRMED").totalAmount(180000d)
                .payment(counter ? null : payment).seats(List.of(
                    Booking.BookedSeat.builder().seatId("A1").seatNumber("A1").build(),
                    Booking.BookedSeat.builder().seatId("A2").seatNumber("A2").build())).build();
        b = mongo.save(b); t.setBookingId(b.getId());
        return tickets.save(t);
    }

    void assertCheckedIn(Ticket t) {
        assertEquals("Used", t.getStatus());
        assertTrue(t.getSeats().stream().allMatch(seat -> "Used".equals(seat.getUsageStatus())));
        assertTrue(t.getSeats().stream().allMatch(seat -> now.toString().equals(seat.getScanMetadata().getScannedAt())));
        assertTrue(t.getSeats().stream().allMatch(seat -> "Main Gate 1".equals(seat.getScanMetadata().getScannedByGate())));
        assertEquals("Used", tickets.findById(t.getId()).orElseThrow().getStatus());
    }

    void rejected(String code, String expected) {
        assertEquals(expected, assertThrows(TicketCheckInException.class, () -> service.checkInTicket(code)).getCode());
    }

    @Test void onlineQrChecksInAndPersistsAllSeats() {
        assertCheckedIn(service.checkInTicket(ticket(false).getQrCode()));
    }

    @Test void jsonEndpointRoundTripUsesTheRealServiceAndMongoDB() throws Exception {
        Ticket t = ticket(false);
        var mvc = org.springframework.test.web.servlet.setup.MockMvcBuilders
                .standaloneSetup(new TicketController(service)).build();
        String body = ticketBody(t, t.getShowtimeId());
        mvc.perform(post("/api/tickets/check-in").contentType("application/json").content(body))
                .andExpect(status().isOk()).andExpect(jsonPath("$.code").value("CHECKED_IN"))
                .andExpect(jsonPath("$.ticket.status").value("Used"));
        mvc.perform(post("/api/tickets/check-in").contentType("application/json").content(body))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("ALREADY_CHECKED_IN"))
                .andExpect(jsonPath("$.ticket.id").value(t.getId()));
        assertCheckedIn(tickets.findById(t.getId()).orElseThrow());
    }

    @Test void counterQrChecksInObjectIdTicket() {
        assertCheckedIn(service.checkInTicket(ticket(true).getQrCode()));
    }

    @Test void confirmationDoesNotReadShowtimeAfterTheAdmissionWrite() throws Exception {
        Ticket t = ticket(false);
        var repository = org.mockito.Mockito.mock(ShowtimeRepository.class);
        var committed = new java.util.concurrent.atomic.AtomicBoolean();
        org.mockito.Mockito.when(repository.findById(t.getShowtimeId())).thenAnswer(invocation -> {
            if (committed.get()) throw new org.springframework.dao.DataAccessResourceFailureException("read unavailable after commit");
            return showtimes.findById(t.getShowtimeId());
        });
        MongoTemplate observed = org.mockito.Mockito.spy(mongo);
        org.mockito.Mockito.doAnswer(invocation -> {
            Object result = invocation.callRealMethod(); committed.set(true); return result;
        }).when(observed).findAndModify(org.mockito.ArgumentMatchers.any(org.springframework.data.mongodb.core.query.Query.class),
                org.mockito.ArgumentMatchers.any(org.springframework.data.mongodb.core.query.UpdateDefinition.class),
                org.mockito.ArgumentMatchers.any(org.springframework.data.mongodb.core.FindAndModifyOptions.class), org.mockito.ArgumentMatchers.eq(Ticket.class));
        var checking = new TicketValidationService(tickets, repository, observed, admission);
        ReflectionTestUtils.setField(checking, "clock", Clock.fixed(now.atZone(ZoneId.systemDefault()).toInstant(), ZoneId.systemDefault()));
        var mvc = org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup(new TicketController(checking)).build();
        mvc.perform(post("/api/tickets/check-in").contentType("application/json").content(ticketBody(t, t.getShowtimeId())))
                .andExpect(status().isOk()).andExpect(jsonPath("$.code").value("CHECKED_IN"))
                .andExpect(jsonPath("$.showtime.id").value(t.getShowtimeId()));
        assertTrue(committed.get()); assertCheckedIn(tickets.findById(t.getId()).orElseThrow());
    }

    @Test void lostWriteReplyCanBeRecoveredByVerificationWithoutOverwritingAdmission() {
        Ticket t = ticket(false);
        MongoTemplate observed = org.mockito.Mockito.spy(mongo);
        org.mockito.Mockito.doAnswer(invocation -> {
            assertNotNull(invocation.callRealMethod());
            throw new org.springframework.dao.DataAccessResourceFailureException("reply lost after real write");
        }).when(observed).findAndModify(org.mockito.ArgumentMatchers.any(org.springframework.data.mongodb.core.query.Query.class),
                org.mockito.ArgumentMatchers.any(org.springframework.data.mongodb.core.query.UpdateDefinition.class),
                org.mockito.ArgumentMatchers.any(org.springframework.data.mongodb.core.FindAndModifyOptions.class), org.mockito.ArgumentMatchers.eq(Ticket.class));
        var checking = new TicketValidationService(tickets, showtimes, observed, admission);
        ReflectionTestUtils.setField(checking, "clock", Clock.fixed(now.atZone(ZoneId.systemDefault()).toInstant(), ZoneId.systemDefault()));
        assertThrows(org.springframework.dao.DataAccessResourceFailureException.class,
                () -> checking.checkInForShowtime(t.getQrCode(), t.getShowtimeId()));
        Ticket committed = tickets.findById(t.getId()).orElseThrow(); assertCheckedIn(committed);
        var recovered = assertThrows(TicketCheckInException.class, () -> service.verifyForShowtime(t.getQrCode(), t.getShowtimeId()));
        assertEquals("ALREADY_CHECKED_IN", recovered.getCode());
        assertEquals(committed, tickets.findById(t.getId()).orElseThrow());
        assertEquals(committed.getSeats(), recovered.getTicket().getSeats());
    }

    @Test void legacyDocumentIdIsAccepted() {
        assertCheckedIn(service.checkInTicket(ticket(false).getId()));
    }

    @Test void manualBookingReferenceAndScannerWhitespaceAreAccepted() {
        assertCheckedIn(service.checkInTicket(" \r\n" + ticket(false).getBookingReference() + "\r\n "));
    }

    @Test void tamperedQrCannotFallBackToValidBookingReference() {
        Ticket t = ticket(false);
        rejected(t.getQrCode() + "tampered", "TICKET_NOT_FOUND");
        rejected("CINEMAHUB|" + t.getBookingReference(), "TICKET_NOT_FOUND");
        assertEquals("Paid", tickets.findById(t.getId()).orElseThrow().getStatus());
    }

    @Test void invalidInputsAreRejected() {
        rejected(null, "INVALID_CODE");
        rejected(" ", "INVALID_CODE");
        rejected("X".repeat(513), "INVALID_CODE");
        rejected("ticket\nwith-control", "INVALID_CODE");
        rejected("https://unrelated.invalid/qr", "INVALID_CODE");
    }

    @Test void missingTicketIsRejected() { rejected("missing-ticket", "TICKET_NOT_FOUND"); }

    @Test void cancelledAndUnpaidTicketsAreRejected() {
        Ticket t = ticket(false);
        t.setStatus("Cancelled"); tickets.save(t);
        rejected(t.getQrCode(), "TICKET_NOT_PAID");
        t.setStatus("Pending"); tickets.save(t);
        rejected(t.getQrCode(), "TICKET_NOT_PAID");
    }

    @Test void duplicateScanReturnsExistingScanMetadataWithoutOverwritingIt() {
        Ticket t = ticket(false);
        Ticket first = service.checkInTicket(t.getQrCode());
        TicketCheckInException duplicate = assertThrows(TicketCheckInException.class, () -> service.checkInTicket(t.getQrCode()));
        assertEquals("ALREADY_CHECKED_IN", duplicate.getCode());
        assertEquals(first.getSeats().get(0).getScanMetadata(), duplicate.getTicket().getSeats().get(0).getScanMetadata());
    }

    @Test void concurrentGatesHaveExactlyOneWinner() throws Exception {
        Ticket t = ticket(false);
        int count = 8;
        CyclicBarrier start = new CyclicBarrier(count);
        ExecutorService pool = Executors.newFixedThreadPool(count);
        try {
            List<Callable<String>> calls = new ArrayList<>();
            for (int i = 0; i < count; i++) calls.add(() -> {
                start.await(5, TimeUnit.SECONDS);
                try { service.checkInTicket(t.getQrCode()); return "CHECKED_IN"; }
                catch (TicketCheckInException ex) { return ex.getCode(); }
            });
            List<String> results = new ArrayList<>();
            for (Future<String> f : pool.invokeAll(calls)) results.add(f.get(10, TimeUnit.SECONDS));
            assertEquals(1, results.stream().filter("CHECKED_IN"::equals).count());
            assertEquals(count - 1, results.stream().filter("ALREADY_CHECKED_IN"::equals).count());
            assertCheckedIn(tickets.findById(t.getId()).orElseThrow());
        } finally { pool.shutdownNow(); }
    }

    void moveShowtime(Ticket t, LocalDateTime start, LocalDateTime end) {
        Showtime s = showtimes.findById(t.getShowtimeId()).orElseThrow();
        s.setStartTime(start); s.setEndTime(end); showtimes.save(s);
    }

    @Test void opensExactlyThirtyMinutesBeforeCanonicalStart() {
        Ticket t = ticket(false);
        moveShowtime(t, now.plusMinutes(30), now.plusHours(2));
        assertCheckedIn(service.checkInTicket(t.getQrCode()));
    }

    @Test void rejectsEarlierThanThirtyMinutesBeforeStart() {
        Ticket t = ticket(false);
        moveShowtime(t, now.plusMinutes(30).plusSeconds(1), now.plusHours(2));
        rejected(t.getQrCode(), "CHECK_IN_NOT_OPEN");
    }

    @Test void stillAllowsAdmissionAfterStartUntilEnd() {
        Ticket t = ticket(false);
        moveShowtime(t, now.minusHours(1), now.plusSeconds(1));
        assertCheckedIn(service.checkInTicket(t.getQrCode()));
    }

    @Test void closesExactlyAtEnd() {
        Ticket t = ticket(false);
        moveShowtime(t, now.minusHours(2), now);
        rejected(t.getQrCode(), "CHECK_IN_CLOSED");
    }

    @Test void rejectsScreeningFromTwoDaysAgoEvenIfTicketSnapshotSaysFuture() {
        Ticket t = ticket(false);
        moveShowtime(t, now.minusDays(2), now.minusDays(2).plusHours(2));
        rejected(t.getQrCode(), "CHECK_IN_CLOSED");
    }

    @Test void cancelledShowtimeIsRejected() {
        Ticket t = ticket(false);
        Showtime s = showtimes.findById(t.getShowtimeId()).orElseThrow();
        s.setStatus("Cancelled"); showtimes.save(s);
        rejected(t.getQrCode(), "SHOWTIME_UNAVAILABLE");
    }

    @Test void missingAndIncompleteShowtimesAreRejected() {
        Ticket t = ticket(false);
        Showtime s = showtimes.findById(t.getShowtimeId()).orElseThrow();
        s.setEndTime(null); showtimes.save(s);
        rejected(t.getQrCode(), "INVALID_SHOWTIME");
        showtimes.deleteById(t.getShowtimeId());
        rejected(t.getQrCode(), "INVALID_SHOWTIME");
        t.setShowtimeId(null); tickets.save(t);
        rejected(t.getQrCode(), "INVALID_TICKET");
    }

    @Test void emptyAndMalformedSeatDataIsNotTreatedAsAUsedTicket() {
        Ticket t = ticket(false);
        t.setSeats(null); tickets.save(t); rejected(t.getQrCode(), "INVALID_TICKET");
        t.setSeats(new ArrayList<>()); tickets.save(t); rejected(t.getQrCode(), "INVALID_TICKET");
        t.setSeats(List.of(new Ticket.SeatStatus("A1", "A1", null))); tickets.save(t);
        rejected(t.getQrCode(), "INVALID_TICKET");
    }

    @Test void olderPaidTicketWithUsedSeatsIsRejectedAsDuplicate() {
        Ticket t = ticket(false);
        t.getSeats().forEach(seat -> seat.setUsageStatus("Used")); tickets.save(t);
        rejected(t.getQrCode(), "ALREADY_CHECKED_IN");
    }

    @Test void partialLegacyTicketPreservesAlreadyScannedSeats() {
        Ticket t = ticket(false);
        t.getSeats().get(0).setUsageStatus("Used");
        Ticket.ScanMetadata old = new Ticket.ScanMetadata();
        old.setScannedAt(now.minusMinutes(1).toString()); old.setScannedByGate("Other gate");
        t.getSeats().get(0).setScanMetadata(old); tickets.save(t);
        Ticket checked = service.checkInTicket(t.getQrCode());
        assertEquals("Used", checked.getStatus());
        assertEquals(old, checked.getSeats().get(0).getScanMetadata());
        assertEquals(now.toString(), checked.getSeats().get(1).getScanMetadata().getScannedAt());
    }

    Booking booking(Ticket t) { return mongo.findById(t.getBookingId(), Booking.class); }

    Seat seat(Ticket t, String number) {
        return mongo.findOne(org.springframework.data.mongodb.core.query.Query.query(
                org.springframework.data.mongodb.core.query.Criteria.where("roomId").is(t.getRoomId())
                        .and("seatNumber").is(number)), Seat.class);
    }

    void invalidForBoth(Ticket t, String expected) {
        assertEquals(expected, assertThrows(TicketCheckInException.class, () -> service.verifyTicket(t.getQrCode())).getCode());
        rejected(t.getQrCode(), expected);
        assertEquals("Paid", tickets.findById(t.getId()).orElseThrow().getStatus());
    }

    @Test void verificationIsRepeatableAndDoesNotConsumeOrStampTicket() {
        Ticket t = ticket(false);
        org.bson.Document before = mongo.getCollection("tickets").find(new org.bson.Document("_id", t.getId())).first();
        for (int i = 0; i < 3; i++) assertEquals("Paid", service.verifyTicket(t.getQrCode()).getStatus());
        assertEquals(before, mongo.getCollection("tickets").find(new org.bson.Document("_id", t.getId())).first());
        assertCheckedIn(service.checkInTicket(t.getQrCode()));
    }

    @Test void verifyEndpointDoesNotCheckInAndConfirmationRevalidates() throws Exception {
        Ticket t = ticket(false);
        var mvc = org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup(new TicketController(service)).build();
        String body = ticketBody(t, t.getShowtimeId());
        mvc.perform(post("/api/tickets/verify").contentType("application/json").content(body))
                .andExpect(status().isOk()).andExpect(jsonPath("$.valid").value(true))
                .andExpect(jsonPath("$.code").value("TICKET_VALID")).andExpect(jsonPath("$.ticket.status").value("Paid"));
        Showtime s = showtimes.findById(t.getShowtimeId()).orElseThrow(); s.setStatus("Cancelled"); showtimes.save(s);
        mvc.perform(post("/api/tickets/check-in").contentType("application/json").content(body))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.valid").value(false))
                .andExpect(jsonPath("$.code").value("SHOWTIME_UNAVAILABLE"));
        assertEquals("Paid", tickets.findById(t.getId()).orElseThrow().getStatus());
    }

    @Test void orphanCancelledAndUnconfirmedBookingsCannotEnter() {
        Ticket t = ticket(false); Booking b = booking(t);
        for (String status : List.of("CANCELLED", "PENDING", "EXPIRED")) {
            b.setStatus(status); mongo.save(b); invalidForBoth(t, "BOOKING_UNAVAILABLE");
        }
        mongo.remove(b); invalidForBoth(t, "BOOKING_UNAVAILABLE");
    }

    @Test void failedMissingOrUnreconciledOnlinePaymentCannotEnter() {
        Ticket t = ticket(false); Booking b = booking(t); Payment payment = b.getPayment();
        for (String status : List.of("FAILED", "PENDING", "CANCELLED")) {
            payment.setStatus(status); mongo.save(b); invalidForBoth(t, "PAYMENT_NOT_CONFIRMED");
        }
        payment.setStatus("SUCCESS"); payment.setReconciliationRequired(true); mongo.save(b);
        invalidForBoth(t, "PAYMENT_NOT_CONFIRMED");
        b.setPayment(null); mongo.save(b); invalidForBoth(t, "PAYMENT_NOT_CONFIRMED");
    }

    @Test void paymentAmountCurrencyAndTransactionMustMatch() {
        Ticket t = ticket(false); Booking b = booking(t); Payment payment = b.getPayment();
        payment.setAmount(BigDecimal.ONE); mongo.save(b); invalidForBoth(t, "PAYMENT_NOT_CONFIRMED");
        payment.setAmount(BigDecimal.valueOf(b.getTotalAmount())); payment.setCurrency("USD"); mongo.save(b);
        invalidForBoth(t, "PAYMENT_NOT_CONFIRMED");
        payment.setCurrency("VND"); payment.setTransactionId(null); mongo.save(b);
        invalidForBoth(t, "PAYMENT_NOT_CONFIRMED");
    }

    @Test void mismatchedTicketRoomCinemaAndBookingLinkAreRejected() {
        Ticket t = ticket(false); String room = t.getRoomId(); String cinema = t.getCinemaId();
        t.setRoomId("wrong-room"); tickets.save(t); invalidForBoth(t, "INVALID_TICKET");
        t.setRoomId(room); t.setCinemaId("wrong-cinema"); tickets.save(t); invalidForBoth(t, "INVALID_TICKET");
        t.setCinemaId(cinema); tickets.save(t); Booking b = booking(t); b.setTicketId("another-ticket"); mongo.save(b);
        invalidForBoth(t, "INVALID_TICKET");
    }

    @Test void ticketCannotRedirectToAnotherShowtimesRoom() {
        Ticket t = ticket(false); Showtime s = showtimes.findById(t.getShowtimeId()).orElseThrow();
        s.setRoomId("different-room"); showtimes.save(s); invalidForBoth(t, "INVALID_TICKET");
    }

    @Test void missingDisabledAndMaintenanceSeatsAreRejected() {
        Ticket t = ticket(false); Seat seat = seat(t, "A1");
        for (String status : List.of("DISABLED", "MAINTENANCE")) {
            seat.setStatus(status); mongo.save(seat); invalidForBoth(t, "INVALID_SEATS");
        }
        mongo.remove(seat); invalidForBoth(t, "INVALID_SEATS");
    }

    @Test void duplicateInventedOrMismatchedTicketSeatsAreRejected() {
        Ticket t = ticket(false);
        t.setSeats(List.of(new Ticket.SeatStatus("A1", "A1", "Unused"), new Ticket.SeatStatus("A1", "A1", "Unused")));
        tickets.save(t); invalidForBoth(t, "INVALID_TICKET");
        t.setSeats(List.of(new Ticket.SeatStatus("Z999", "Z999", "Unused"))); tickets.save(t);
        invalidForBoth(t, "INVALID_TICKET");
        t.setSeats(List.of(new Ticket.SeatStatus("A1", "A2", "Unused"))); tickets.save(t);
        invalidForBoth(t, "INVALID_TICKET");
    }

    @Test void ticketAndBookingMustContainExactlyTheSameSeats() {
        Ticket t = ticket(false); t.setSeats(List.of(t.getSeats().get(0))); tickets.save(t);
        invalidForBoth(t, "INVALID_TICKET");
    }

    @Test void disabledOrMissingVenueIsRejected() {
        Ticket t = ticket(false); ScreenRoom room = mongo.findById(t.getRoomId(), ScreenRoom.class);
        room.setStatus("Disabled"); mongo.save(room); invalidForBoth(t, "VENUE_UNAVAILABLE");
        room.setStatus("Active"); mongo.save(room); Cinema cinema = mongo.findById(t.getCinemaId(), Cinema.class);
        cinema.setStatus("Disabled"); mongo.save(cinema); invalidForBoth(t, "VENUE_UNAVAILABLE");
        mongo.remove(cinema); invalidForBoth(t, "VENUE_UNAVAILABLE");
    }

    @Test void legacyCounterTicketResolvesOnlyThroughExplicitBookingTicketLink() {
        Ticket t = ticket(true); t.setBookingId(null); tickets.save(t);
        assertEquals("Paid", service.verifyTicket(t.getQrCode()).getStatus());
        assertCheckedIn(service.checkInTicket(t.getQrCode()));
    }

    @Test void duplicateReferenceIsAControlledConflictButExactQrStillWorks() {
        Ticket first = ticket(false); ticket(true);
        invalidReference(first.getBookingReference());
        assertEquals("Paid", service.verifyTicket(first.getQrCode()).getStatus());
        assertCheckedIn(service.checkInTicket(first.getId()));
        assertThrows(org.springframework.web.server.ResponseStatusException.class,
                () -> bookings.getBookingDetails(first.getBookingReference()));
    }

    void invalidReference(String reference) {
        assertEquals("AMBIGUOUS_CODE", assertThrows(TicketCheckInException.class,
                () -> service.verifyTicket(reference)).getCode());
        rejected(reference, "AMBIGUOUS_CODE");
    }

    @Test void duplicateQrIsAlsoAControlledConflict() {
        Ticket first = ticket(false); Ticket second = ticket(true); second.setQrCode(first.getQrCode()); tickets.save(second);
        invalidReference(first.getQrCode());
    }

    @Test void extendedBookingReferencesAreAcceptedAlongsideLegacyReferences() {
        Ticket t = ticket(false); Booking b = booking(t);
        String reference = "CH-261020-" + UUID.randomUUID().toString().replace("-", "").toUpperCase();
        t.setBookingReference(reference); b.setBookingReference(reference); mongo.save(b); tickets.save(t);
        assertCheckedIn(service.checkInTicket(reference));
    }

    @Test void emptyMalformedAndCancelledTicketsNeverReportCheckedIn() {
        Ticket t = ticket(false); Booking b = booking(t);
        t.setSeats(List.of()); tickets.save(t);
        assertEquals(false, bookings.getBookingStatus(b.getBookingReference()).get("isCheckedIn"));
        t.setSeats(java.util.Arrays.asList((Ticket.SeatStatus) null)); tickets.save(t);
        assertEquals(false, bookings.getBookingStatus(b.getBookingReference()).get("isCheckedIn"));
        t.setSeats(List.of(new Ticket.SeatStatus("A1", "A1", "Used"))); t.setStatus("Cancelled"); tickets.save(t);
        assertEquals(false, bookings.getBookingStatus(b.getBookingReference()).get("isCheckedIn"));
        t.setStatus("Used"); tickets.save(t); b.setStatus("CANCELLED"); mongo.save(b);
        assertEquals(false, bookings.getBookingStatus(b.getBookingReference()).get("isCheckedIn"));
    }

    CounterBookingRequest counterRequest(Ticket t, List<String> seats) {
        CounterBookingRequest req = new CounterBookingRequest(); req.setShowtimeId(t.getShowtimeId());
        req.setSeatIds(seats); req.setCustomerName("Counter customer"); req.setPaymentMethod("CASH");
        Showtime s = showtimes.findById(t.getShowtimeId()).orElseThrow();
        s.setStartTime(LocalDateTime.now().plusMinutes(10)); s.setEndTime(LocalDateTime.now().plusHours(2)); showtimes.save(s);
        Booking b = booking(t); b.setStatus("CANCELLED"); mongo.save(b);
        return req;
    }

    @Test void counterIssuanceRejectsInventedDuplicateAndInactiveSeatsWithoutSaving() {
        Ticket t = ticket(true);
        CounterBookingRequest req = counterRequest(t, List.of("Z999"));
        assertThrows(RuntimeException.class, () -> bookings.createCounterBooking(req, "staff"));
        req.setSeatIds(List.of("A1", "A1"));
        assertThrows(RuntimeException.class, () -> bookings.createCounterBooking(req, "staff"));
        req.setSeatIds(List.of("A1")); Seat seat = seat(t, "A1"); seat.setStatus("DISABLED"); mongo.save(seat);
        assertThrows(RuntimeException.class, () -> bookings.createCounterBooking(req, "staff"));
        assertEquals(1, mongo.getCollection("tickets").countDocuments());
        assertEquals(1, mongo.getCollection("bookings").countDocuments());
    }

    @Test void realCounterIssuanceLinksBookingAndCanBeVerifiedThenCheckedIn() {
        Ticket old = ticket(true); CounterBookingRequest req = counterRequest(old, List.of("A1", "A2"));
        var issued = bookings.createCounterBooking(req, "staff"); Ticket t = (Ticket) issued.get("ticket");
        Booking b = (Booking) issued.get("booking"); assertEquals(b.getId(), t.getBookingId());
        assertTrue(t.getBookingReference().matches("CH-[0-9]{6}-[A-F0-9]{32}"));
        Showtime s = showtimes.findById(t.getShowtimeId()).orElseThrow();
        ReflectionTestUtils.setField(service, "clock", Clock.fixed(s.getStartTime().minusMinutes(10)
                .atZone(ZoneId.systemDefault()).toInstant(), ZoneId.systemDefault()));
        assertEquals("Paid", service.verifyTicket(t.getQrCode()).getStatus());
        assertEquals("Used", service.checkInTicket(t.getQrCode()).getStatus());
        assertEquals(true, bookings.getBookingStatus(b.getBookingReference()).get("isCheckedIn"));
    }

    @Test void counterCannotBypassOnlinePaymentWithAnUnconfirmedGatewayMethod() {
        Ticket t = ticket(true); CounterBookingRequest req = counterRequest(t, List.of("A1")); req.setPaymentMethod("VNPAY");
        assertThrows(RuntimeException.class, () -> bookings.createCounterBooking(req, "staff"));
        assertEquals(1, mongo.getCollection("tickets").countDocuments());
    }

    @Test void showtimeCancellationCannotInterleaveBetweenValidationAndTicketClaim() throws Exception {
        Ticket t = ticket(false);
        MongoTemplate observed = org.mockito.Mockito.spy(mongo);
        CountDownLatch claiming = new CountDownLatch(1); CountDownLatch release = new CountDownLatch(1);
        org.mockito.Mockito.doAnswer(invocation -> {
            claiming.countDown(); assertTrue(release.await(5, TimeUnit.SECONDS));
            assertEquals("Active", showtimes.findById(t.getShowtimeId()).orElseThrow().getStatus());
            return invocation.callRealMethod();
        }).when(observed).findAndModify(org.mockito.ArgumentMatchers.any(org.springframework.data.mongodb.core.query.Query.class),
                org.mockito.ArgumentMatchers.any(org.springframework.data.mongodb.core.query.UpdateDefinition.class),
                org.mockito.ArgumentMatchers.any(org.springframework.data.mongodb.core.FindAndModifyOptions.class), org.mockito.ArgumentMatchers.eq(Ticket.class));
        TicketValidationService checking = new TicketValidationService(tickets, showtimes, observed, admission);
        ReflectionTestUtils.setField(checking, "clock", Clock.fixed(now.atZone(ZoneId.systemDefault()).toInstant(), ZoneId.systemDefault()));
        ShowtimeService management = new ShowtimeService();
        ReflectionTestUtils.setField(management, "admission", admission);
        ReflectionTestUtils.setField(management, "showtimeRepository", showtimes);
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            Future<Ticket> scan = pool.submit(() -> checking.checkInTicket(t.getQrCode()));
            assertTrue(claiming.await(5, TimeUnit.SECONDS));
            CountDownLatch cancelStarted = new CountDownLatch(1);
            Future<Showtime> cancellation = pool.submit(() -> { cancelStarted.countDown(); return management.updateStatus(t.getShowtimeId(), "Cancelled"); });
            assertTrue(cancelStarted.await(5, TimeUnit.SECONDS));
            assertThrows(TimeoutException.class, () -> cancellation.get(150, TimeUnit.MILLISECONDS));
            release.countDown(); assertEquals("Used", scan.get(5, TimeUnit.SECONDS).getStatus());
            assertEquals("Cancelled", cancellation.get(5, TimeUnit.SECONDS).getStatus());
        } finally { release.countDown(); pool.shutdownNow(); }
    }

    @Test void partialDuplicateOrUnrelatedUsedSeatsDoNotReportFullCheckIn() {
        Ticket t = ticket(false);
        t.setStatus("Used"); t.setSeats(List.of(new Ticket.SeatStatus("A1", "A1", "Used"))); tickets.save(t);
        assertEquals(false, bookings.getBookingStatus(t.getBookingReference()).get("isCheckedIn"));
        t.setSeats(List.of(new Ticket.SeatStatus("A1", "A1", "Used"), new Ticket.SeatStatus("A1", "A1", "Used")));
        tickets.save(t); assertEquals(false, bookings.getBookingStatus(t.getBookingReference()).get("isCheckedIn"));
    }

    @Test void admissionRechecksClosingBoundaryAfterDependencyValidation() {
        Ticket t = ticket(false); Clock advancing = org.mockito.Mockito.mock(Clock.class);
        org.mockito.Mockito.when(advancing.getZone()).thenReturn(ZoneId.systemDefault());
        org.mockito.Mockito.when(advancing.instant()).thenReturn(now.atZone(ZoneId.systemDefault()).toInstant(),
                now.plusHours(2).atZone(ZoneId.systemDefault()).toInstant());
        ReflectionTestUtils.setField(service, "clock", advancing);
        rejected(t.getQrCode(), "CHECK_IN_CLOSED");
        assertEquals("Paid", tickets.findById(t.getId()).orElseThrow().getStatus());
    }

    void assertInvalidUsage(Ticket t, String code) {
        Ticket before = tickets.findById(t.getId()).orElseThrow();
        assertEquals(code, assertThrows(TicketCheckInException.class, () -> service.verifyTicket(t.getQrCode())).getCode());
        rejected(t.getQrCode(), code);
        var summary = bookings.getBookingStatus(booking(t).getBookingReference());
        assertEquals("INVALID", summary.get("usageStatus"));
        assertEquals(false, summary.get("isCheckedIn"));
        assertEquals(false, summary.get("isPartiallyCheckedIn"));
        assertEquals(before, tickets.findById(t.getId()).orElseThrow());
    }

    @Test void usedStatusWithUnusedEmptyNullOrDuplicateSeatsIsInvalidEverywhere() {
        Ticket t = ticket(false); t.setStatus("Used"); tickets.save(t);
        assertInvalidUsage(t, "INVALID_TICKET");
        t.setSeats(List.of()); tickets.save(t); assertInvalidUsage(t, "INVALID_TICKET");
        t.setSeats(null); tickets.save(t); assertInvalidUsage(t, "INVALID_TICKET");
        t.setSeats(List.of(new Ticket.SeatStatus("A1", "A1", "Used"), new Ticket.SeatStatus("A1", "A1", "Used")));
        tickets.save(t); assertInvalidUsage(t, "INVALID_TICKET");
    }

    @Test void unknownCaseInSeatStatusCannotProduceAFalseUsedSummary() {
        Ticket t = ticket(false); t.getSeats().forEach(seat -> seat.setUsageStatus("used")); tickets.save(t);
        assertInvalidUsage(t, "INVALID_TICKET");
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(strings = {"showtime", "room", "cinema", "booking", "reference", "seat-label"})
    void usedTicketMustMatchItsBooking(String mismatch) {
        Ticket t = service.checkInTicket(ticket(false).getQrCode()); Booking b = booking(t);
        switch (mismatch) {
            case "showtime" -> t.setShowtimeId("wrong-showtime");
            case "room" -> t.setRoomId("wrong-room");
            case "cinema" -> t.setCinemaId("wrong-cinema");
            case "booking" -> t.setBookingId("wrong-booking");
            case "reference" -> t.setBookingReference("CH-261020-WXYZ");
            case "seat-label" -> t.getSeats().get(0).setSeatNumber("A999");
            default -> throw new AssertionError();
        }
        tickets.save(t);
        assertEquals(mismatch.equals("booking") ? "BOOKING_UNAVAILABLE" : "INVALID_TICKET",
                assertThrows(TicketCheckInException.class, () -> service.verifyTicket(t.getQrCode())).getCode());
        var summary = bookings.getBookingStatus(b.getBookingReference());
        assertEquals("INVALID", summary.get("usageStatus")); assertEquals(false, summary.get("isCheckedIn"));
    }

    @Test void historicalUsedTicketStillReportsUsedAfterScreeningEndsWithoutChangingMetadata() {
        Ticket t = service.checkInTicket(ticket(false).getQrCode());
        moveShowtime(t, now.minusHours(3), now.minusHours(1));
        Ticket before = tickets.findById(t.getId()).orElseThrow();
        for (int i = 0; i < 3; i++) {
            assertEquals("ALREADY_CHECKED_IN", assertThrows(TicketCheckInException.class,
                    () -> service.verifyTicket(t.getQrCode())).getCode());
            rejected(t.getId(), "ALREADY_CHECKED_IN");
        }
        assertEquals(before, tickets.findById(t.getId()).orElseThrow());
        assertEquals(true, bookings.getBookingStatus(t.getBookingReference()).get("isCheckedIn"));
    }

    @Test void cancelledBookingWithUsedTicketIsNotReportedAsValidUsedAdmission() {
        Ticket t = service.checkInTicket(ticket(false).getQrCode()); Booking b = booking(t);
        b.setStatus("CANCELLED"); mongo.save(b); assertInvalidUsage(t, "BOOKING_UNAVAILABLE");
    }

    @Test void partialUsageApiRoundTripShowsRemainingSeatsAndPreservesPriorScan() throws Exception {
        Ticket t = ticket(false); t.getSeats().get(0).setUsageStatus("Used");
        Ticket.ScanMetadata previous = new Ticket.ScanMetadata();
        previous.setScannedAt(now.minusMinutes(5).toString()); previous.setScannedByGate("Gate A");
        t.getSeats().get(0).setScanMetadata(previous); tickets.save(t);
        Ticket before = tickets.findById(t.getId()).orElseThrow();
        var mvc = org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup(new TicketController(service)).build();
        String body = ticketBody(t, t.getShowtimeId());
        mvc.perform(post("/api/tickets/verify").contentType("application/json").content(body))
                .andExpect(status().isOk()).andExpect(jsonPath("$.code").value("TICKET_PARTIALLY_USED"))
                .andExpect(jsonPath("$.usageStatus").value("PARTIALLY_USED"))
                .andExpect(jsonPath("$.canCheckIn").value(true))
                .andExpect(jsonPath("$.ticket.seats[0].usageStatus").value("Used"))
                .andExpect(jsonPath("$.ticket.seats[1].usageStatus").value("Unused"));
        assertEquals(before, tickets.findById(t.getId()).orElseThrow());
        var summary = bookings.getBookingStatus(t.getBookingReference());
        assertEquals("PARTIALLY_USED", summary.get("usageStatus"));
        assertEquals(true, summary.get("isPartiallyCheckedIn")); assertEquals(false, summary.get("isCheckedIn"));
        mvc.perform(post("/api/tickets/check-in").contentType("application/json").content(body))
                .andExpect(status().isOk()).andExpect(jsonPath("$.usageStatus").value("USED"))
                .andExpect(jsonPath("$.canCheckIn").value(false));
        Ticket after = tickets.findById(t.getId()).orElseThrow();
        assertEquals(previous, after.getSeats().get(0).getScanMetadata());
        assertEquals(now.toString(), after.getSeats().get(1).getScanMetadata().getScannedAt());
        assertEquals("Main Gate 1", after.getSeats().get(1).getScanMetadata().getScannedByGate());
        mvc.perform(post("/api/tickets/verify").contentType("application/json").content(body))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("ALREADY_CHECKED_IN"))
                .andExpect(jsonPath("$.usageStatus").value("USED"))
                .andExpect(jsonPath("$.canCheckIn").value(false));
        assertEquals(true, bookings.getBookingStatus(t.getBookingReference()).get("isCheckedIn"));
        assertEquals(after, tickets.findById(t.getId()).orElseThrow());
    }

    @Test void partialTicketCannotConsumeRemainingSeatsAfterTheWindowCloses() {
        Ticket t = ticket(false); t.getSeats().get(0).setUsageStatus("Used"); tickets.save(t);
        moveShowtime(t, now.minusHours(3), now.minusHours(1));
        invalidForBoth(t, "CHECK_IN_CLOSED");
    }

    @Test void independentGateCoordinatorsStillHaveExactlyOneAtomicClaimWinner() throws Exception {
        Ticket t = ticket(false); int count = 8; CyclicBarrier start = new CyclicBarrier(count);
        ExecutorService pool = Executors.newFixedThreadPool(count);
        try {
            List<Callable<String>> calls = new ArrayList<>();
            for (int i = 0; i < count; i++) calls.add(() -> {
                TicketValidationService gate = new TicketValidationService(tickets, showtimes, mongo, new AdmissionCoordinator());
                ReflectionTestUtils.setField(gate, "clock", Clock.fixed(now.atZone(ZoneId.systemDefault()).toInstant(), ZoneId.systemDefault()));
                start.await(5, TimeUnit.SECONDS);
                try { gate.checkInForShowtime(t.getQrCode(), t.getShowtimeId()); return "CHECKED_IN"; }
                catch (TicketCheckInException ex) { return ex.getCode(); }
            });
            List<String> results = new ArrayList<>();
            for (Future<String> result : pool.invokeAll(calls)) results.add(result.get(10, TimeUnit.SECONDS));
            assertEquals(1, results.stream().filter("CHECKED_IN"::equals).count());
            assertEquals(count - 1, results.stream().filter("ALREADY_CHECKED_IN"::equals).count());
        } finally { pool.shutdownNow(); }
    }

    String ticketBody(Ticket ticket, String expectedShowtimeId) {
        return "{\"code\":\"" + ticket.getQrCode() + "\",\"expectedShowtimeId\":\"" + expectedShowtimeId + "\"}";
    }

    @Test void twoScreeningsOfTheSameMovieCannotBeInterchangedAtEitherEndpoint() throws Exception {
        Ticket expected = ticket(false); Ticket other = ticket(true);
        Showtime first = showtimes.findById(expected.getShowtimeId()).orElseThrow();
        Showtime second = showtimes.findById(other.getShowtimeId()).orElseThrow();
        second.setMovieId(first.getMovieId()); showtimes.save(second);
        Booking secondBooking = booking(other); secondBooking.setMovieId(first.getMovieId()); mongo.save(secondBooking);
        var mvc = org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup(new TicketController(service)).build();
        for (String endpoint : List.of("verify", "check-in")) {
            mvc.perform(post("/api/tickets/" + endpoint).contentType("application/json")
                    .content(ticketBody(other, expected.getShowtimeId())))
                    .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("SHOWTIME_MISMATCH"))
                    .andExpect(jsonPath("$.canCheckIn").value(false));
        }
        mvc.perform(post("/api/tickets/check-in/" + other.getId()).param("expectedShowtimeId", expected.getShowtimeId()))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("SHOWTIME_MISMATCH"));
        assertEquals(other, tickets.findById(other.getId()).orElseThrow());
        assertEquals(expected, tickets.findById(expected.getId()).orElseThrow());
        mvc.perform(post("/api/tickets/verify").contentType("application/json").content(ticketBody(other, other.getShowtimeId())))
                .andExpect(status().isOk()).andExpect(jsonPath("$.showtime.id").value(other.getShowtimeId()));
        mvc.perform(post("/api/tickets/check-in").contentType("application/json").content(ticketBody(other, other.getShowtimeId())))
                .andExpect(status().isOk()).andExpect(jsonPath("$.ticket.status").value("Used"));
    }

    @Test void queryParameterCannotReplaceTheMandatoryJsonScreeningContext() throws Exception {
        Ticket t = ticket(false);
        var mvc = org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup(new TicketController(service)).build();
        for (String endpoint : List.of("verify", "check-in")) {
            mvc.perform(post("/api/tickets/" + endpoint).param("expectedShowtimeId", t.getShowtimeId())
                    .contentType("application/json").content("{\"code\":\"" + t.getQrCode() + "\"}"))
                    .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("SHOWTIME_REQUIRED"));
        }
        assertEquals(t, tickets.findById(t.getId()).orElseThrow());
    }

    @Test void rescheduledVerificationReturnsCurrentTimesWithoutRewritingTicketSnapshot() throws Exception {
        Ticket t = ticket(false); LocalDateTime issuedStart = t.getShowtimeStart();
        moveShowtime(t, now.plusMinutes(25), now.plusHours(3));
        var mvc = org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup(new TicketController(service)).build();
        mvc.perform(post("/api/tickets/verify").contentType("application/json").content(ticketBody(t, t.getShowtimeId())))
                .andExpect(status().isOk()).andExpect(jsonPath("$.showtime.startTime").value("2026-10-20T19:25:00"))
                .andExpect(jsonPath("$.showtime.endTime").value("2026-10-20T22:00:00"))
                .andExpect(jsonPath("$.ticket.showtimeStart").value("2026-10-20T19:10:00"));
        assertEquals(t, tickets.findById(t.getId()).orElseThrow());
        var admitted = service.checkInForShowtime(t.getQrCode(), t.getShowtimeId());
        assertEquals(now.plusMinutes(25), admitted.showtime().getStartTime());
        assertEquals(issuedStart, admitted.ticket().getShowtimeStart());
        assertEquals(issuedStart, tickets.findById(t.getId()).orElseThrow().getShowtimeStart());
    }

    @Test void showtimeChangeAfterVerificationIsCheckedAgainAtConfirmation() {
        Ticket t = ticket(false);
        service.verifyForShowtime(t.getQrCode(), t.getShowtimeId());
        moveShowtime(t, now.plusMinutes(31), now.plusHours(3));
        assertEquals("CHECK_IN_NOT_OPEN", assertThrows(TicketCheckInException.class,
                () -> service.checkInForShowtime(t.getQrCode(), t.getShowtimeId())).getCode());
        assertEquals(t, tickets.findById(t.getId()).orElseThrow());
    }

    @Test void changingExpectedScreeningAfterVerificationCannotConsumeTheTicket() {
        Ticket t = ticket(false); Ticket other = ticket(true);
        service.verifyForShowtime(t.getQrCode(), t.getShowtimeId());
        assertEquals("SHOWTIME_MISMATCH", assertThrows(TicketCheckInException.class,
                () -> service.checkInForShowtime(t.getQrCode(), other.getShowtimeId())).getCode());
        assertEquals(t, tickets.findById(t.getId()).orElseThrow());
    }

    @Test void usedTicketFromAnotherScreeningReturnsMismatchRatherThanUsedWarning() {
        Ticket t = ticket(false); Ticket other = ticket(true); service.checkInForShowtime(t.getQrCode(), t.getShowtimeId());
        assertEquals("SHOWTIME_MISMATCH", assertThrows(TicketCheckInException.class,
                () -> service.verifyForShowtime(t.getQrCode(), other.getShowtimeId())).getCode());
        assertEquals("ALREADY_CHECKED_IN", assertThrows(TicketCheckInException.class,
                () -> service.verifyForShowtime(t.getQrCode(), t.getShowtimeId())).getCode());
    }

    @Test void historicalUsedTicketCanStillBeInspectedIfItsScreeningWasDeleted() throws Exception {
        Ticket t = ticket(false); service.checkInForShowtime(t.getQrCode(), t.getShowtimeId()); showtimes.deleteById(t.getShowtimeId());
        var mvc = org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup(new TicketController(service)).build();
        mvc.perform(post("/api/tickets/verify").contentType("application/json").content(ticketBody(t, t.getShowtimeId())))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("ALREADY_CHECKED_IN"))
                .andExpect(jsonPath("$.showtime").doesNotExist());
    }

    @Test void contextValidationRejectsMissingControlCharactersAndOversizedIds() {
        Ticket t = ticket(false);
        assertEquals("SHOWTIME_REQUIRED", assertThrows(TicketCheckInException.class,
                () -> service.verifyForShowtime(t.getQrCode(), null)).getCode());
        for (String id : List.of("bad\ncontext", "X".repeat(129))) {
            assertEquals("INVALID_SHOWTIME_CONTEXT", assertThrows(TicketCheckInException.class,
                    () -> service.checkInForShowtime(t.getQrCode(), id)).getCode());
        }
        assertEquals(t, tickets.findById(t.getId()).orElseThrow());
    }
}
