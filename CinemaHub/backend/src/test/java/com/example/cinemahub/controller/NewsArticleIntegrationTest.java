package com.example.cinemahub.controller;

import com.example.cinemahub.dto.NewsArticleRequest;
import com.example.cinemahub.model.NewsArticle;
import com.example.cinemahub.repository.NewsArticleRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {
        "payment.scheduler.enabled=false",
        "app.seed-users=false",
        "app.seed-data=false",
        "spring.mongodb.database=cinemahub_news_test",
        "vnpay.enabled=false"
})
@AutoConfigureMockMvc
class NewsArticleIntegrationTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private NewsArticleRepository newsArticleRepository;

    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    private NewsArticle activeArticle;
    private NewsArticle draftArticle;

    @BeforeEach
    void setUp() {
        newsArticleRepository.deleteAll();

        activeArticle = newsArticleRepository.save(NewsArticle.builder()
                .title("Bom tấn Avatar 3 hé lộ công nghệ chiếu rạp")
                .summary("Công nghệ 3D thế hệ mới tại CinemaHub")
                .content("Nội dung chi tiết siêu phẩm Avatar 3 với độ phân giải 4K HFR 120fps.")
                .category("DIEN_ANH")
                .author("HuyTG - Tester")
                .tags(Arrays.asList("Avatar", "3D", "IMAX"))
                .active(true)
                .views(100L)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build());

        draftArticle = newsArticleRepository.save(NewsArticle.builder()
                .title("[Bản nháp] Sự kiện ra mắt phim sắp tới")
                .summary("Chưa công bố cho khách hàng")
                .content("Nội dung dự thảo chỉ dành riêng cho Admin.")
                .category("SU_KIEN")
                .author("Admin")
                .tags(Arrays.asList("Sự kiện", "Draft"))
                .active(false)
                .views(5L)
                .createdAt(LocalDateTime.now().minusDays(1))
                .updatedAt(LocalDateTime.now().minusDays(1))
                .build());
    }

    // ==========================================
    // 1. TEST VIEW NEWS LIST & PUBLIC FILTER
    // ==========================================
    @Test
    @DisplayName("Khách công khai chỉ xem được bài viết Active, không được thấy bài viết Đã ẩn")
    void publicNewsListShouldOnlyContainActiveArticles() throws Exception {
        mvc.perform(get("/api/news/public"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].title").value("Bom tấn Avatar 3 hé lộ công nghệ chiếu rạp"))
                .andExpect(jsonPath("$[0].active").value(true));
    }

    @Test
    @DisplayName("Admin có thể xem toàn bộ bài viết (cả Active lẫn Inactive)")
    void adminCanViewAllArticles() throws Exception {
        mvc.perform(get("/api/news"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)));
    }

    // ==========================================
    // 2. TEST VIEW NEWS DETAILS & VIEW COUNT
    // ==========================================
    @Test
    @DisplayName("Xem chi tiết bài viết thành công và tự động tăng số lượt xem")
    void viewNewsDetailsShouldIncrementViewCount() throws Exception {
        mvc.perform(get("/api/news/" + activeArticle.getId()).param("incrementViews", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(activeArticle.getId()))
                .andExpect(jsonPath("$.title").value("Bom tấn Avatar 3 hé lộ công nghệ chiếu rạp"))
                .andExpect(jsonPath("$.views").value(101));

        NewsArticle updated = newsArticleRepository.findById(activeArticle.getId()).orElseThrow();
        assertEquals(101L, updated.getViews());
    }

    // ==========================================
    // 3. TEST CREATE NEWS ARTICLE & SECURITY
    // ==========================================
    @Test
    @DisplayName("Người dùng chưa đăng nhập không thể tạo bài viết (401/403)")
    void anonymousCannotCreateArticle() throws Exception {
        NewsArticleRequest req = NewsArticleRequest.builder()
                .title("Bài viết bất hợp pháp")
                .content("Nội dung")
                .build();

        mvc.perform(post("/api/news")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().is4xxClientError());
    }

    @Test
    @WithMockUser(username = "customer1", roles = "Customer")
    @DisplayName("Khách hàng thông thường không được phép tạo bài viết (403 Forbidden)")
    void customerCannotCreateArticle() throws Exception {
        NewsArticleRequest req = NewsArticleRequest.builder()
                .title("Bài viết từ khách")
                .content("Nội dung")
                .build();

        mvc.perform(post("/api/news")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "adminUser", roles = "Admin")
    @DisplayName("Admin tạo bài viết thành công với đầy đủ thông tin hợp lệ")
    void adminCanCreateArticleSuccessfully() throws Exception {
        NewsArticleRequest req = NewsArticleRequest.builder()
                .title("Khai trương rạp CinemaHub Đà Nẵng")
                .summary("Cụm rạp mới nhất tại miền Trung")
                .content("Rạp CinemaHub Đà Nẵng sở hữu 8 phòng chiếu hiện đại tiêu chuẩn quốc tế.")
                .category("THONG_BAO")
                .author("HuyTG - Editor")
                .tags(List.of("Đà Nẵng", "Khai trương"))
                .active(true)
                .build();

        mvc.perform(post("/api/news")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andExpect(jsonPath("$.title").value("Khai trương rạp CinemaHub Đà Nẵng"))
                .andExpect(jsonPath("$.category").value("THONG_BAO"))
                .andExpect(jsonPath("$.active").value(true));

        assertEquals(3, newsArticleRepository.count());
    }

    @Test
    @WithMockUser(username = "adminUser", roles = "Admin")
    @DisplayName("Validate nghiệp vụ: Không được để trống tiêu đề khi tạo bài viết (400 Bad Request)")
    void createWithoutTitleFails() throws Exception {
        NewsArticleRequest req = NewsArticleRequest.builder()
                .title("")
                .content("Nội dung không có tiêu đề")
                .build();

        mvc.perform(post("/api/news")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    // ==========================================
    // 4. TEST EDIT NEWS ARTICLE
    // ==========================================
    @Test
    @WithMockUser(username = "adminUser", roles = "Manager")
    @DisplayName("Manager có thể chỉnh sửa thông tin bài viết")
    void managerCanUpdateArticle() throws Exception {
        NewsArticleRequest req = NewsArticleRequest.builder()
                .title("Tiêu đề đã được cập nhật bởi Manager")
                .summary("Tóm tắt mới")
                .content("Nội dung đã được chỉnh sửa chi tiết hơn.")
                .category("KHUYEN_MAI")
                .active(true)
                .build();

        mvc.perform(put("/api/news/" + activeArticle.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Tiêu đề đã được cập nhật bởi Manager"))
                .andExpect(jsonPath("$.category").value("KHUYEN_MAI"));

        NewsArticle updated = newsArticleRepository.findById(activeArticle.getId()).orElseThrow();
        assertEquals("Tiêu đề đã được cập nhật bởi Manager", updated.getTitle());
    }

    // ==========================================
    // 5. TEST ENABLE / DISABLE NEWS ARTICLE
    // ==========================================
    @Test
    @WithMockUser(username = "adminUser", roles = "Admin")
    @DisplayName("Bật/Tắt trạng thái hiển thị (Enable/Disable) bài viết tức thì")
    void toggleStatusShouldWorkCorrectly() throws Exception {
        // Tắt hiển thị (Disable bài activeArticle)
        mvc.perform(patch("/api/news/" + activeArticle.getId() + "/status").param("active", "false"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(false));

        // Kiểm tra khách không còn thấy bài này nữa
        mvc.perform(get("/api/news/public"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));

        // Bật lại hiển thị (Enable bài activeArticle)
        mvc.perform(patch("/api/news/" + activeArticle.getId() + "/status").param("active", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(true));

        // Khách lại thấy bài này
        mvc.perform(get("/api/news/public"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));
    }

    // ==========================================
    // 6. TEST SEARCH & FILTER FOR NEWS
    // ==========================================
    @Test
    @DisplayName("Tìm kiếm tin tức theo từ khóa, chuyên mục và trạng thái")
    void searchNewsShouldReturnFilteredResults() throws Exception {
        // Tìm theo từ khóa "Avatar"
        mvc.perform(get("/api/news").param("search", "Avatar"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].title", containsString("Avatar")));

        // Lọc theo Category "SU_KIEN"
        mvc.perform(get("/api/news").param("category", "SU_KIEN"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].category").value("SU_KIEN"));

        // Lọc theo trạng thái active=false
        mvc.perform(get("/api/news").param("active", "false"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].active").value(false));
    }

    // ==========================================
    // 7. TEST DELETE NEWS ARTICLE
    // ==========================================
    @Test
    @WithMockUser(username = "adminUser", roles = "Admin")
    @DisplayName("Admin có thể xóa vĩnh viễn bài viết khỏi cơ sở dữ liệu")
    void adminCanDeleteArticle() throws Exception {
        mvc.perform(delete("/api/news/" + draftArticle.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").isNotEmpty());

        assertFalse(newsArticleRepository.existsById(draftArticle.getId()));
        assertEquals(1, newsArticleRepository.count());
    }
}
