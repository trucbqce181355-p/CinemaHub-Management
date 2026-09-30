package com.example.cinemahub.service;

import com.example.cinemahub.model.Cinema;
import com.example.cinemahub.model.ScreenRoom;
import com.example.cinemahub.repository.CinemaRepository;
import com.example.cinemahub.repository.ScreenRoomRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class CinemaService {
    @Autowired
    private CinemaRepository cinemaRepository;
    
    @Autowired
    private ScreenRoomRepository screenRoomRepository;

    public List<Cinema> getAllCinemas() {
        return cinemaRepository.findAll();
    }
    
    public Cinema getCinemaById(String id) {
        return cinemaRepository.findById(id).orElseThrow(() -> new RuntimeException("Cinema not found"));
    }
    
    public Cinema createCinema(Cinema cinema) {
        cinema.setStatus("Active");
        return cinemaRepository.save(cinema);
    }
    
    public Cinema updateCinema(String id, Cinema cinemaDetails) {
        Cinema cinema = getCinemaById(id);
        cinema.setName(cinemaDetails.getName());
        cinema.setAddress(cinemaDetails.getAddress());
        cinema.setContactEmail(cinemaDetails.getContactEmail());
        cinema.setContactPhone(cinemaDetails.getContactPhone());
        cinema.setFacilities(cinemaDetails.getFacilities());
        if (cinemaDetails.getStatus() != null) {
            cinema.setStatus(cinemaDetails.getStatus());
        }
        return cinemaRepository.save(cinema);
    }
    
    public Cinema disableCinema(String id) {
        Cinema cinema = getCinemaById(id);
        cinema.setStatus("Disabled");
        return cinemaRepository.save(cinema);
    }

    public void deleteCinemaPermanently(String id) {
        // Kiểm tra xem có phòng chiếu nào thuộc rạp này còn đang hoạt động không
        List<ScreenRoom> rooms = screenRoomRepository.findByCinemaId(id);
        for (ScreenRoom room : rooms) {
            if ("Active".equals(room.getStatus())) {
                throw new RuntimeException("Vẫn còn phòng chiếu [" + room.getName() + "] đang hoạt động! Vui lòng cho tất cả phòng chiếu Ngưng hoạt động (Bảo trì) trước khi xóa vĩnh viễn Rạp này.");
            }
        }
        
        // Nếu tất cả phòng đã Disabled, tiến hành dọn dẹp toàn bộ phòng chiếu của rạp này để tránh rác DB
        screenRoomRepository.deleteAll(rooms);
        
        // Cuối cùng mới xóa rạp
        cinemaRepository.deleteById(id);
    }
}
