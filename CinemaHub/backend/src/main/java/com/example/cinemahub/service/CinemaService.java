package com.example.cinemahub.service;

import com.example.cinemahub.model.Cinema;
import com.example.cinemahub.model.Showtime;
import com.example.cinemahub.repository.CinemaRepository;
import com.example.cinemahub.repository.ShowtimeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.gridfs.GridFsResource;
import org.springframework.data.mongodb.gridfs.GridFsTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import com.mongodb.client.gridfs.model.GridFSFile;
import org.bson.types.ObjectId;
import java.io.IOException;
import java.net.URI;
import java.time.LocalDate;
import java.util.List;

@Service
public class CinemaService {
    @Autowired
    private AdmissionCoordinator admission;

    @Autowired
    private ScreeningActivityService screeningActivity;

    @Autowired
    private CinemaRepository cinemaRepository;
    
    @Autowired
    private ShowtimeRepository showtimeRepository;

    @Autowired
    private GridFsTemplate gridFsTemplate;

    public List<Showtime> getShowtimes(String id, LocalDate from, LocalDate to) {
        getCinemaById(id);
        if (from == null || to == null || to.isBefore(from) || to.isAfter(from.plusDays(30))) {
            throw new IllegalArgumentException("Khoảng ngày phải hợp lệ và không quá 31 ngày.");
        }
        return showtimeRepository.findByCinemaIdAndStartTimeBetweenOrderByStartTimeAsc(
            id, from.atStartOfDay(), to.plusDays(1).atStartOfDay().minusNanos(1));
    }

    public GridFsResource getImage(String id) {
        if (!ObjectId.isValid(id)) throw new IllegalArgumentException("Ảnh rạp không hợp lệ.");
        GridFSFile file = gridFsTemplate.findOne(Query.query(Criteria.where("_id").is(new ObjectId(id))));
        if (file == null) throw new IllegalArgumentException("Không tìm thấy ảnh rạp.");
        return gridFsTemplate.getResource(file);
    }

    public List<Cinema> getAllCinemas() {
        return cinemaRepository.findAll().stream()
                .filter(cinema -> !cinema.isDeleted())
                .toList();
    }
    
    public Cinema getCinemaById(String id) {
        return cinemaRepository.findById(id).orElseThrow(() -> new RuntimeException("Cinema not found"));
    }
    
    public Cinema createCinema(Cinema cinema) {
        return createCinema(cinema, null);
    }

    public Cinema createCinema(Cinema cinema, MultipartFile image) {
        return admission.write(() -> createCinemaInternal(cinema, image));
    }

    private Cinema createCinemaInternal(Cinema cinema, MultipartFile image) {
        validate(cinema);
        cinema.setContactPhone(normalizeHotline(cinema.getContactPhone()));
        cinema.setId(null);
        cinema.setImageId(null);
        cinema.setStatus("Active");
        cinema.setDeleted(false);
        String newImageId = storeImage(image);
        if (newImageId != null) cinema.setImageId(newImageId);
        try {
            return cinemaRepository.save(cinema);
        } catch (RuntimeException e) {
            deleteImage(newImageId);
            throw e;
        }
    }
    
    public Cinema updateCinema(String id, Cinema cinemaDetails) {
        return updateCinema(id, cinemaDetails, null);
    }

    public Cinema updateCinema(String id, Cinema cinemaDetails, MultipartFile image) {
        return admission.write(() -> updateCinemaInternal(id, cinemaDetails, image));
    }

    private Cinema updateCinemaInternal(String id, Cinema cinemaDetails, MultipartFile image) {
        validate(cinemaDetails);
        Cinema cinema = getCinemaById(id);
        if (cinema.isDeleted()) throw new IllegalArgumentException("Cụm rạp đã được xóa khỏi danh sách, không thể chỉnh sửa hoặc kích hoạt lại.");
        if ("Disabled".equalsIgnoreCase(cinemaDetails.getStatus())) {
            screeningActivity.assertCinemaCanDisable(id);
        }
        String hotline = cinemaDetails.getContactPhone();
        if (!java.util.Objects.equals(hotline, cinema.getContactPhone())) {
            hotline = normalizeHotline(hotline);
        }
        String oldImageId = cinema.getImageId();
        String newImageId = storeImage(image);
        cinema.setName(cinemaDetails.getName());
        cinema.setAddress(cinemaDetails.getAddress());
        cinema.setContactEmail(cinemaDetails.getContactEmail());
        cinema.setContactPhone(hotline);
        cinema.setFacilities(cinemaDetails.getFacilities());
        cinema.setDescription(cinemaDetails.getDescription());
        cinema.setHouseRules(cinemaDetails.getHouseRules());
        cinema.setServices(cinemaDetails.getServices());
        cinema.setImageUrl(cinemaDetails.getImageUrl());
        if (newImageId != null) cinema.setImageId(newImageId);
        else if (cinemaDetails.getImageUrl() != null && !cinemaDetails.getImageUrl().isBlank()) cinema.setImageId(null);
        else if (cinemaDetails.getImageId() == null) cinema.setImageId(null);
        if (cinemaDetails.getStatus() != null) {
            cinema.setStatus(cinemaDetails.getStatus());
        }
        Cinema saved;
        try {
            saved = cinemaRepository.save(cinema);
        } catch (RuntimeException e) {
            deleteImage(newImageId);
            throw e;
        }
        if (oldImageId != null && !oldImageId.equals(saved.getImageId())) {
            try { deleteImage(oldImageId); } catch (RuntimeException ignored) { /* The saved cinema remains valid. */ }
        }
        return saved;
    }

    private void validate(Cinema cinema) {
        if (cinema == null || cinema.getName() == null || cinema.getName().isBlank()
                || cinema.getAddress() == null || cinema.getAddress().isBlank()) {
            throw new IllegalArgumentException("Tên và địa chỉ rạp là bắt buộc.");
        }
        if (cinema.getName().length() > 200 || cinema.getAddress().length() > 500
                || (cinema.getDescription() != null && cinema.getDescription().length() > 500)) {
            throw new IllegalArgumentException("Tên, địa chỉ hoặc mô tả vượt quá độ dài cho phép.");
        }
        String url = cinema.getImageUrl();
        if (url != null && !url.isBlank()) {
            try {
                URI uri = URI.create(url);
                if (url.length() > 2048 || !"https".equalsIgnoreCase(uri.getScheme()) || uri.getHost() == null) {
                    throw new IllegalArgumentException("URL ảnh phải là đường dẫn HTTPS hợp lệ.");
                }
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("URL ảnh phải là đường dẫn HTTPS hợp lệ.");
            }
        }
        validateItems(cinema.getFacilities());
        validateItems(cinema.getHouseRules());
        validateItems(cinema.getServices());
    }

    private String normalizeHotline(String value) {
        if (value == null || value.isBlank()) return "";
        String digits = value.replace(" ", "").trim();
        if (!digits.matches("1900\\d{4}") || !value.trim().matches("1900 ?\\d{4}")) {
            throw new IllegalArgumentException("Số tổng đài phải có dạng 1900 xxxx.");
        }
        return "1900 " + digits.substring(4);
    }

    private void validateItems(List<String> items) {
        if (items != null && (items.size() > 30 || items.stream().anyMatch(item -> item == null || item.isBlank() || item.length() > 200))) {
            throw new IllegalArgumentException("Mỗi danh sách tối đa 30 mục, mỗi mục từ 1 đến 200 ký tự.");
        }
    }

    private String storeImage(MultipartFile image) {
        if (image == null || image.isEmpty()) return null;
        if (image.getSize() > 5 * 1024 * 1024) throw new IllegalArgumentException("Ảnh rạp không được vượt quá 5 MB.");
        String contentType = image.getContentType();
        if (!List.of("image/jpeg", "image/png", "image/webp").contains(contentType)) {
            throw new IllegalArgumentException("Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP.");
        }
        try {
            byte[] signature = image.getInputStream().readNBytes(12);
            if (!validImageSignature(signature, contentType)) throw new IllegalArgumentException("Nội dung file không phải ảnh hợp lệ.");
            ObjectId id = gridFsTemplate.store(image.getInputStream(), "cinema-image", contentType);
            return id.toHexString();
        } catch (IOException e) {
            throw new IllegalArgumentException("Không đọc được file ảnh.", e);
        }
    }

    private boolean validImageSignature(byte[] b, String type) {
        if ("image/jpeg".equals(type)) return b.length >= 3 && (b[0] & 255) == 0xff && (b[1] & 255) == 0xd8 && (b[2] & 255) == 0xff;
        if ("image/png".equals(type)) return b.length >= 8 && (b[0] & 255) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G';
        return b.length >= 12 && b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F' && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P';
    }

    private void deleteImage(String id) {
        if (id != null && ObjectId.isValid(id)) gridFsTemplate.delete(Query.query(Criteria.where("_id").is(new ObjectId(id))));
    }
    
    public Cinema disableCinema(String id) {
        return admission.write(() -> disableCinemaInternal(id));
    }

    private Cinema disableCinemaInternal(String id) {
        Cinema cinema = getCinemaById(id);
        screeningActivity.assertCinemaCanDisable(id);
        cinema.setStatus("Disabled");
        return cinemaRepository.save(cinema);
    }

    public Cinema softDeleteCinema(String id) {
        return admission.write(() -> {
            Cinema cinema = getCinemaById(id);
            if (!"Disabled".equalsIgnoreCase(cinema.getStatus())) {
                throw new IllegalArgumentException("Vui lòng ngưng hoạt động cụm rạp trước khi xóa.");
            }
            cinema.setDeleted(true);
            return cinemaRepository.save(cinema);
        });
    }

}
