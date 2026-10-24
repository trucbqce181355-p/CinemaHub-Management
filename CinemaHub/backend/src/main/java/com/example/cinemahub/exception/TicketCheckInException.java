package com.example.cinemahub.exception;

import com.example.cinemahub.model.Ticket;
import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class TicketCheckInException extends RuntimeException {
    private final HttpStatus status;
    private final String code;
    private final Ticket ticket;

    public TicketCheckInException(HttpStatus status, String code, String message, Ticket ticket) {
        super(message);
        this.status = status;
        this.code = code;
        this.ticket = ticket;
    }
}
