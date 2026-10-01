package com.example.cinemahub.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties={"payment.scheduler.enabled=false", "app.seed-users=false", "app.seed-data=false",
        "spring.mongodb.database=cinemahub_context_test", "vnpay.enabled=false"})
@AutoConfigureMockMvc
class PaymentHttpSecurityTest {
    @Autowired MockMvc mvc;

    @Test void anonymousCannotCreatePayment() throws Exception {
        mvc.perform(post("/api/payment/create-vnpay-url").contentType("application/json").content("{\"bookingId\":\"b\"}"))
                .andExpect(status().is4xxClientError());
    }

    @Test void unsignedPublicIpnIsRejectedWithoutAuthentication() throws Exception {
        mvc.perform(get("/api/payment/vnpay-ipn").param("vnp_TxnRef","unknown"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.RspCode").value("97"));
    }

    @Test @WithMockUser(username="owner",roles="Customer")
    void simulationEndpointIsGone() throws Exception {
        mvc.perform(post("/api/payment/simulate-vnpay-success").contentType("application/json").content("{\"bookingId\":\"b\"}"))
                .andExpect(status().isNotFound());
    }

    @Test @WithMockUser(username="owner",roles="Customer")
    void directBookingConfirmationCannotIssueTicket() throws Exception {
        mvc.perform(post("/api/bookings/b/confirm").contentType("application/json").content("{\"paymentMethod\":\"VNPAY\"}"))
                .andExpect(status().is4xxClientError());
    }

    @Test @WithMockUser(username="owner",roles="Customer")
    void customerCannotUseCounterBypass() throws Exception {
        mvc.perform(post("/api/bookings/counter-booking").contentType("application/json").content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test @WithMockUser(username="owner",roles="Customer")
    void missingGatewayReturnsExplicitUnavailable() throws Exception {
        mvc.perform(post("/api/payment/create-vnpay-url").contentType("application/json").content("{\"bookingId\":\"b\"}"))
                .andExpect(status().isServiceUnavailable()).andExpect(jsonPath("$.error").exists());
    }
}
