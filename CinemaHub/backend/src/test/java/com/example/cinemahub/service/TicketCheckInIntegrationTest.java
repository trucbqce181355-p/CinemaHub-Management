package com.example.cinemahub.service;

import com.example.cinemahub.exception.TicketCheckInException;
import com.example.cinemahub.controller.TicketController;
import com.example.cinemahub.model.Showtime;
import com.example.cinemahub.model.Ticket;
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
    final LocalDateTime now = LocalDateTime.of(2026, 10, 20, 19, 0);

    @BeforeEach void setup() {
        client = MongoClients.create("mongodb://127.0.0.1:27017/?serverSelectionTimeoutMS=3000");
        mongo = new MongoTemplate(client, "ticket_scan_test_" + UUID.randomUUID().toString().replace("-", ""));
        MongoRepositoryFactory factory = new MongoRepositoryFactory(mongo);
        tickets = factory.getRepository(TicketRepository.class);
        showtimes = factory.getRepository(ShowtimeRepository.class);
        service = new TicketValidationService(tickets, showtimes, mongo);
        ReflectionTestUtils.setField(service, "clock", Clock.fixed(
                now.atZone(ZoneId.systemDefault()).toInstant(), ZoneId.systemDefault()));
    }

    @AfterEach void cleanup() {
        if (mongo != null && mongo.getDb().getName().startsWith("ticket_scan_test_")) mongo.getDb().drop();
        if (client != null) client.close();
    }

    Ticket ticket(boolean counter) {
        Showtime s = new Showtime();
        s.setStartTime(now.plusMinutes(10));
        s.setEndTime(now.plusHours(2));
        s.setStatus("Active");
        s = showtimes.save(s);
        Ticket t = new Ticket();
        if (!counter) t.setId("PAY-" + UUID.randomUUID());
        t.setBookingReference("CH-261020-ABCD");
        t.setShowtimeId(s.getId());
        t.setShowtimeStart(s.getStartTime());
        t.setStatus("Paid");
        t.setQrCode("CINEMAHUB|" + (counter ? "COUNTER|" : "") + t.getBookingReference() + "|" + UUID.randomUUID());
        t.setSeats(new ArrayList<>(List.of(new Ticket.SeatStatus("A1", "A1", "Unused"),
                new Ticket.SeatStatus("A2", "A2", "Unused"))));
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
        String body = "{\"code\":\"" + t.getQrCode() + "\"}";
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
        rejected(t.getQrCode(), "INVALID_SHOWTIME");
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
}
