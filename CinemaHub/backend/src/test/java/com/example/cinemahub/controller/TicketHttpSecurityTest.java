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

    private String body(String code) {
        return "{\"code\":\"" + code + "\",\"expectedShowtimeId\":\"showtime\"}";
    }

    private TicketValidationService.CheckedTicket checked(Ticket ticket) {
        var showtime = new com.example.cinemahub.model.Showtime(); showtime.setId("showtime");
        return new TicketValidationService.CheckedTicket(ticket, showtime);
    }

    @Test void anonymousCannotCheckIn() throws Exception {
        mvc.perform(post("/api/tickets/check-in").contentType("application/json").content(body("ticket")))
                .andExpect(status().is4xxClientError());
        verifyNoInteractions(service);
    }

    @Test void customerCannotUseEitherCheckInEndpoint() throws Exception {
        mvc.perform(post("/api/tickets/check-in").with(user("customer").roles("Customer"))
                .contentType("application/json").content(body("ticket")))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/tickets/check-in/ticket").with(user("customer").roles("Customer")))
                .andExpect(status().isForbidden());
        verifyNoInteractions(service);
    }

    @ParameterizedTest @ValueSource(strings = {"Staff", "Manager", "Admin"})
    void staffRolesCanSubmitTheCompleteQr(String role) throws Exception {
        String qr = "CINEMAHUB|COUNTER|CH-261020-ABCD|random-token";
        Ticket t = new Ticket(); t.setId("ticket"); t.setStatus("Used");
        when(service.checkInForShowtime(qr, "showtime")).thenReturn(checked(t));
        mvc.perform(post("/api/tickets/check-in").with(user("employee").roles(role))
                .contentType("application/json").content(body(qr)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.code").value("CHECKED_IN"))
                .andExpect(jsonPath("$.ticket.status").value("Used"));
        verify(service).checkInForShowtime(qr, "showtime");
    }

    @Test void legacyIdEndpointStillWorks() throws Exception {
        Ticket t = new Ticket(); t.setId("PAY-ticket");
        when(service.checkInForShowtime("PAY-ticket", "showtime")).thenReturn(checked(t));
        mvc.perform(post("/api/tickets/check-in/PAY-ticket").param("expectedShowtimeId", "showtime").with(user("employee").roles("Staff")))
                .andExpect(status().isOk());
    }

    @Test void blankAndOversizedCodesAreRejectedBeforeLookup() throws Exception {
        for (String code : new String[]{"", "  ", "X".repeat(513)}) {
            mvc.perform(post("/api/tickets/check-in").with(user("employee").roles("Staff"))
                    .contentType("application/json").content(body(code)))
                    .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("INVALID_CODE"));
        }
        verifyNoInteractions(service);
    }

    @Test void duplicateScanHasAStableErrorCodeAndExistingTicket() throws Exception {
        Ticket t = new Ticket(); t.setId("ticket"); t.setStatus("Used");
        when(service.checkInForShowtime("ticket", "showtime")).thenThrow(new TicketCheckInException(
                HttpStatus.CONFLICT, "ALREADY_CHECKED_IN", "Already checked in", t));
        mvc.perform(post("/api/tickets/check-in").with(user("employee").roles("Staff"))
                .contentType("application/json").content(body("ticket")))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("ALREADY_CHECKED_IN"))
                .andExpect(jsonPath("$.ticket.id").value("ticket"));
    }

    @Test void verifyEndpointRejectsAnonymousAndCustomer() throws Exception {
        mvc.perform(post("/api/tickets/verify").contentType("application/json").content(body("ticket")))
                .andExpect(status().is4xxClientError());
        mvc.perform(post("/api/tickets/verify").with(user("customer").roles("Customer"))
                .contentType("application/json").content(body("ticket")))
                .andExpect(status().isForbidden());
        verifyNoInteractions(service);
    }

    @ParameterizedTest @ValueSource(strings = {"Staff", "Manager", "Admin"})
    void staffCanVerifyWithoutInvokingCheckIn(String role) throws Exception {
        Ticket t = new Ticket(); t.setId("ticket"); t.setStatus("Paid");
        t.setSeats(java.util.List.of(new Ticket.SeatStatus("A1", "A1", "Unused")));
        when(service.verifyForShowtime("ticket", "showtime")).thenReturn(checked(t));
        mvc.perform(post("/api/tickets/verify").with(user("employee").roles(role))
                .contentType("application/json").content(body("ticket")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.valid").value(true))
                .andExpect(jsonPath("$.code").value("TICKET_VALID"))
                .andExpect(jsonPath("$.usageStatus").value("UNUSED"))
                .andExpect(jsonPath("$.canCheckIn").value(true))
                .andExpect(jsonPath("$.ticket.status").value("Paid"));
        verify(service).verifyForShowtime("ticket", "showtime");
        verify(service, never()).checkInForShowtime(anyString(), anyString());
    }

    @Test void invalidVerifyPayloadIsRejectedBeforeLookup() throws Exception {
        for (String code : new String[]{"", "  ", "X".repeat(513)}) {
            mvc.perform(post("/api/tickets/verify").with(user("employee").roles("Staff"))
                    .contentType("application/json").content(body(code)))
                    .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("INVALID_CODE"));
        }
        verifyNoInteractions(service);
    }

    @ParameterizedTest @ValueSource(strings = {"verify", "check-in"})
    void missingBlankOrOversizedScreeningContextIsRejectedBeforeLookup(String endpoint) throws Exception {
        for (String content : new String[]{"{\"code\":\"ticket\"}",
                "{\"code\":\"ticket\",\"expectedShowtimeId\":\"  \"}",
                "{\"code\":\"ticket\",\"expectedShowtimeId\":\"" + "X".repeat(129) + "\"}"}) {
            mvc.perform(post("/api/tickets/" + endpoint).with(user("employee").roles("Staff"))
                    .contentType("application/json").content(content)).andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.canCheckIn").value(false));
        }
        verifyNoInteractions(service);
    }

    @Test void legacyEndpointCannotBypassMissingScreeningContext() throws Exception {
        mvc.perform(post("/api/tickets/check-in/ticket").with(user("employee").roles("Staff")))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("SHOWTIME_REQUIRED"));
        verifyNoInteractions(service);
    }
}
