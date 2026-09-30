package com.example.cinemahub.service;

import com.example.cinemahub.model.Ticket;
import com.example.cinemahub.repository.TicketRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;

@Service
public class TicketValidationService {
    @Autowired
    private TicketRepository ticketRepository;
    
    public Ticket checkInTicket(String ticketId) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy vé hợp lệ trong hệ thống"));
                
        if (!"Paid".equals(ticket.getStatus())) {
            throw new RuntimeException("Vé chưa được thanh toán hoặc đã bị hủy");
        }
        
        boolean allUsed = true;
        if (ticket.getSeats() != null) {
            for (Ticket.SeatStatus seat : ticket.getSeats()) {
                if (!"Used".equals(seat.getUsageStatus())) {
                    allUsed = false;
                    seat.setUsageStatus("Used");
                    
                    Ticket.ScanMetadata meta = new Ticket.ScanMetadata();
                    meta.setScannedAt(LocalDateTime.now().toString());
                    meta.setScannedByGate("Main Gate 1");
                    seat.setScanMetadata(meta);
                }
            }
        }
        
        if (allUsed) {
            throw new RuntimeException("Vé này đã được Check-in (sử dụng) trước đó rồi!");
        }
        
        return ticketRepository.save(ticket);
    }
}
