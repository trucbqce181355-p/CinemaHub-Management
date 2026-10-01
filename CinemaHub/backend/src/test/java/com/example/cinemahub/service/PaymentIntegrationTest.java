package com.example.cinemahub.service;

import com.example.cinemahub.config.VnpayConfig;
import com.example.cinemahub.model.Booking;
import com.example.cinemahub.model.Payment;
import com.example.cinemahub.repository.PaymentRepository;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoClient;
import org.junit.jupiter.api.*;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.*;
import java.util.stream.Collectors;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/** Uses a unique disposable database, never the imported cinemahub database. */
class PaymentIntegrationTest {
    MongoClient client;
    MongoTemplate mongo;
    PaymentRepository repository;
    VnPayService gateway;
    BookingService bookingService;
    PaymentService service;
    static final String TEST_SECRET = "unit-test-only-not-a-merchant-key";

    @BeforeEach void setup() {
        client = MongoClients.create("mongodb://127.0.0.1:27017/?serverSelectionTimeoutMS=3000");
        mongo = new MongoTemplate(client, "payment_test_" + UUID.randomUUID().toString().replace("-", ""));
        repository = new PaymentRepository(mongo);
        VnpayConfig config = new VnpayConfig();
        ReflectionTestUtils.setField(config, "tmnCode", "TESTCODE");
        ReflectionTestUtils.setField(config, "hashSecret", TEST_SECRET);
        ReflectionTestUtils.setField(config, "payUrl", "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html");
        ReflectionTestUtils.setField(config, "returnUrl", "http://localhost:5173/payment-callback");
        gateway = new VnPayService(config);
        ReflectionTestUtils.setField(gateway, "enabled", true);
        bookingService = mock(BookingService.class);
        service = new PaymentService(repository, gateway, bookingService);
    }

    @AfterEach void cleanup() {
        if (mongo != null && mongo.getDb().getName().startsWith("payment_test_")) mongo.getDb().drop();
        if (client != null) client.close();
    }

    Booking booking() {
        Booking b = Booking.builder().userId("owner").bookingReference(UUID.randomUUID().toString())
                .totalAmount(120000d).subtotal(120000d).status("PENDING")
                .holdExpiresAt(LocalDateTime.now().plusMinutes(10)).build();
        return mongo.insert(b);
    }

    Map<String, String> callback(Payment payment, boolean success) {
        Map<String, String> fields = new TreeMap<>();
        fields.put("vnp_TxnRef", payment.getTransactionId());
        fields.put("vnp_TmnCode", "TESTCODE");
        fields.put("vnp_Amount", payment.getAmount().movePointRight(2).toPlainString());
        fields.put("vnp_ResponseCode", success ? "00" : "24");
        fields.put("vnp_TransactionStatus", success ? "00" : "02");
        fields.put("vnp_TransactionNo", "123456");
        sign(fields);
        return fields;
    }

    void sign(Map<String, String> fields) {
        fields.remove("vnp_SecureHash");
        String data = new TreeMap<>(fields).entrySet().stream().filter(e -> !e.getValue().isEmpty())
                .map(e -> e.getKey()+"="+URLEncoder.encode(e.getValue(), StandardCharsets.US_ASCII)).collect(Collectors.joining("&"));
        fields.put("vnp_SecureHash", VnpayConfig.hmacSHA512(TEST_SECRET, data));
    }

    @Test void duplicateInitiationReturnsSameStoredUrl() {
        Booking b = booking();
        Payment first = service.initiate(b.getId(), "owner", null);
        Payment second = service.initiate(b.getId(), "owner", null);
        assertEquals(first.getTransactionId(), second.getTransactionId());
        assertEquals(first.getCheckoutUrl(), second.getCheckoutUrl());
        assertEquals(new BigDecimal("120000"), first.getAmount());
        assertTrue(first.getCheckoutUrl().contains("vnp_Amount=12000000"));
    }

    @Test void concurrentInitiationHasOneWinner() throws Exception {
        Booking b = booking();
        ExecutorService pool = Executors.newFixedThreadPool(8);
        try {
            List<Callable<String>> tasks = new ArrayList<>();
            for (int i=0;i<12;i++) tasks.add(() -> service.initiate(b.getId(), "owner", null).getTransactionId());
            Set<String> ids = new HashSet<>();
            for (Future<String> f : pool.invokeAll(tasks)) ids.add(f.get());
            assertEquals(1, ids.size());
        } finally { pool.shutdownNow(); }
    }

    @Test void successAndDuplicateCallbackIssueOnce() {
        Booking b = booking(); Payment p = service.initiate(b.getId(), "owner", null);
        assertEquals("00", service.confirm(callback(p,true)));
        assertEquals("02", service.confirm(callback(p,true)));
        assertEquals("CONFIRMED", repository.find(b.getId()).getStatus());
        assertEquals("SUCCESS", repository.find(b.getId()).getPayment().getStatus());
        verify(bookingService, times(1)).issuePaidTicket(b.getId());
    }

    @Test void failedPaymentReleasesBookingAndCannotBecomeSuccess() {
        Booking b = booking(); Payment p = service.initiate(b.getId(), "owner", null);
        assertEquals("00", service.confirm(callback(p,false)));
        assertEquals("CANCELLED", repository.find(b.getId()).getStatus());
        assertEquals("02", service.confirm(callback(p,true)));
        assertTrue(repository.find(b.getId()).getPayment().isReconciliationRequired());
        verifyNoInteractions(bookingService);
    }

    @Test void expiryIsIdempotentAndLateSuccessNeedsReview() {
        Booking b = booking(); Payment p = service.initiate(b.getId(), "owner", null);
        assertTrue(repository.expire(b.getId(), b.getHoldExpiresAt().plusSeconds(1)));
        assertFalse(repository.expire(b.getId(), b.getHoldExpiresAt().plusSeconds(2)));
        assertEquals("02", service.confirm(callback(p,true)));
        assertEquals("EXPIRED", repository.find(b.getId()).getPayment().getStatus());
        assertTrue(repository.find(b.getId()).getPayment().isReconciliationRequired());
        verifyNoInteractions(bookingService);
    }

    @Test void signatureAmountMerchantAndOwnershipAreChecked() {
        Booking b = booking();
        assertThrows(ResponseStatusException.class, () -> service.initiate(b.getId(), "other", null));
        Payment p = service.initiate(b.getId(), "owner", null);
        Map<String,String> data = callback(p,true);
        data.put("vnp_Amount", "100");
        assertEquals("97", service.confirm(data));
        sign(data); assertEquals("04", service.confirm(data));
        data=callback(p,true);data.put("vnp_TmnCode", "OTHER");sign(data);
        assertEquals("97", service.confirm(data));
        assertEquals("PENDING", repository.find(b.getId()).getPayment().getStatus());
    }

    @Test void missingConfigurationCreatesNoPayment() {
        Booking b = booking();ReflectionTestUtils.setField(gateway,"enabled",false);
        assertThrows(ResponseStatusException.class, () -> service.initiate(b.getId(), "owner", null));
        assertNull(repository.find(b.getId()).getPayment());
    }

    @Test void callbackAndTimeoutCannotBothWin() throws Exception {
        Booking b = booking(); Payment p = service.initiate(b.getId(),"owner",null);
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            Future<?> confirm = pool.submit(() -> service.confirm(callback(p,true)));
            Future<?> expire = pool.submit(() -> repository.expire(b.getId(), b.getHoldExpiresAt().plusSeconds(1)));
            confirm.get();expire.get();
            Booking result=repository.find(b.getId());
            assertTrue(("CONFIRMED".equals(result.getStatus()) && "SUCCESS".equals(result.getPayment().getStatus()))
                    || ("EXPIRED".equals(result.getStatus()) && "EXPIRED".equals(result.getPayment().getStatus())));
        } finally {pool.shutdownNow();}
    }

    @Test void schedulerContinuesAfterOneRecordFails() {
        PaymentRepository repo=mock(PaymentRepository.class);
        Booking a=booking(),b=booking();
        when(repo.expired(any())).thenReturn(List.of(a,b));
        when(repo.expire(eq(a.getId()),any())).thenThrow(new RuntimeException("test failure"));
        when(repo.unissued()).thenReturn(List.of());
        new PaymentService(repo,gateway,bookingService).processTimedOutPayments();
        verify(repo).expire(eq(b.getId()),any());
    }

    @Test void realTicketIssuanceRetriesWithoutChangingQrOrDuplicatingTicket() {
        Booking b=booking(); Payment p=service.initiate(b.getId(),"owner",null);
        service.confirm(callback(p,true));
        var factory=new org.springframework.data.mongodb.repository.support.MongoRepositoryFactory(mongo);
        BookingService real=new BookingService();
        ReflectionTestUtils.setField(real,"mongo",mongo);
        ReflectionTestUtils.setField(real,"bookingRepository",factory.getRepository(com.example.cinemahub.repository.BookingRepository.class));
        ReflectionTestUtils.setField(real,"ticketRepository",factory.getRepository(com.example.cinemahub.repository.TicketRepository.class));
        ReflectionTestUtils.setField(real,"emailService",mock(EmailService.class));
        var first=(com.example.cinemahub.model.Ticket)real.issuePaidTicket(b.getId()).get("ticket");
        var second=(com.example.cinemahub.model.Ticket)real.issuePaidTicket(b.getId()).get("ticket");
        assertEquals(first.getId(),second.getId());
        assertEquals(first.getQrCode(),second.getQrCode());
        assertEquals(1,mongo.getCollection("tickets").countDocuments());
        assertEquals(first.getId(),repository.find(b.getId()).getTicketId());
    }
}
