package com.example.cinemahub.service;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(name="payment.scheduler.enabled", havingValue="true", matchIfMissing=true)
@RequiredArgsConstructor
public class PaymentTimeoutScheduler {
    private final PaymentService payments;
    @Scheduled(fixedDelayString = "${payment.timeout.scan-ms:30000}")
    public void expirePayments() { payments.processTimedOutPayments(); }
}
