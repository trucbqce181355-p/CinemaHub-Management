package com.example.cinemahub.controller;

import com.example.cinemahub.exception.TicketCheckInException;
import com.example.cinemahub.model.Ticket;
import com.example.cinemahub.service.TicketValidationService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {"payment.scheduler.enabled=false", "app.seed-users=false", "app.seed-data=false",
        "spring.mongodb.database=ticket_http_context_test", "vnpay.enabled=false"})
@AutoConfigureMockMvc
class TicketHttpSecurityTest {
    @Autowired MockMvc mvc;
    @MockitoBean TicketValidationService service;

    @Test void anonymousCannotCheckIn() throws Exception {
        mvc.perform(post("/api/tickets/check-in").contentType("application/json").content("{\"code\":\"ticket\"}"))
                .andExpect(status().is4xxClientError());
        verifyNoInteractions(service);
    }

    @Test void customerCannotUseEitherCheckInEndpoint() throws Exception {
        mvc.perform(post("/api/tickets/check-in").with(user("customer").roles("Customer"))
                .contentType("application/json").content("{\"code\":\"ticket\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/tickets/check-in/ticket").with(user("customer").roles("Customer")))
                .andExpect(status().isForbidden());
        verifyNoInteractions(service);
    }

    @ParameterizedTest @ValueSource(strings = {"Staff", "Manager", "Admin"})
    void staffRolesCanSubmitTheCompleteQr(String role) throws Exception {
        String qr = "CINEMAHUB|COUNTER|CH-261020-ABCD|random-token";
        Ticket t = new Ticket(); t.setId("ticket"); t.setStatus("Used");
        when(service.checkInTicket(qr)).thenReturn(t);
        mvc.perform(post("/api/tickets/check-in").with(user("employee").roles(role))
                .contentType("application/json").content("{\"code\":\"" + qr + "\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.code").value("CHECKED_IN"))
                .andExpect(jsonPath("$.ticket.status").value("Used"));
        verify(service).checkInTicket(qr);
    }

    @Test void legacyIdEndpointStillWorks() throws Exception {
        Ticket t = new Ticket(); t.setId("PAY-ticket");
        when(service.checkInTicket("PAY-ticket")).thenReturn(t);
        mvc.perform(post("/api/tickets/check-in/PAY-ticket").with(user("employee").roles("Staff")))
                .andExpect(status().isOk());
    }

    @Test void blankAndOversizedCodesAreRejectedBeforeLookup() throws Exception {
        for (String code : new String[]{"", "  ", "X".repeat(513)}) {
            mvc.perform(post("/api/tickets/check-in").with(user("employee").roles("Staff"))
                    .contentType("application/json").content("{\"code\":\"" + code + "\"}"))
                    .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("INVALID_CODE"));
        }
        verifyNoInteractions(service);
    }

    @Test void duplicateScanHasAStableErrorCodeAndExistingTicket() throws Exception {
        Ticket t = new Ticket(); t.setId("ticket"); t.setStatus("Used");
        when(service.checkInTicket("ticket")).thenThrow(new TicketCheckInException(
                HttpStatus.CONFLICT, "ALREADY_CHECKED_IN", "Already checked in", t));
        mvc.perform(post("/api/tickets/check-in").with(user("employee").roles("Staff"))
                .contentType("application/json").content("{\"code\":\"ticket\"}"))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("ALREADY_CHECKED_IN"))
                .andExpect(jsonPath("$.ticket.id").value("ticket"));
    }
}
