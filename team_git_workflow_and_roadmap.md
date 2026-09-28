# Kế Hoạch Làm Việc Nhóm & Quản Lý Source Code (Git Flow)

Để dự án **CinemaHub** tránh được cảnh "đè code của nhau" (Merge Conflict) khi nhiều người cùng làm, nhóm cần tuân thủ một quy trình Git (Git Flow) chặt chẽ. Dưới đây là bộ quy tắc đề xuất cho nhóm:

## 1. Cấu trúc nhánh (Branching Strategy)
Tuyệt đối không ai được code trực tiếp trên nhánh `main`. Nhóm sẽ chia làm 3 cấp độ nhánh:

*   **`main` (hoặc `master`)**: Nhánh chứa code hoàn chỉnh, ổn định nhất. Chỉ merge vào đây khi chuẩn bị báo cáo/nộp bài.
*   **`develop`**: Nhánh hội tụ code của cả nhóm. Code ở đây phải chạy được (không lỗi biên dịch). Mọi người sẽ lấy code mới nhất từ nhánh này về.
*   **`feature/[tên-chức-năng]`**: Nhánh làm việc cá nhân của mỗi người. 
    *   *Ví dụ:* Nếu bạn làm chức năng Check-in, bạn tạo nhánh: `feature/ticket-checkin`
    *   *Ví dụ:* Nếu bạn làm phần Khuyến mãi, tạo nhánh: `feature/promotion-management`

## 2. Quy tắc Pull & Push hàng ngày (Thần chú chống Conflict)

Mỗi khi bạn bắt đầu ngồi vào bàn code, hãy thực hiện theo thứ tự sau:

**Đầu giờ làm việc (Đồng bộ code):**
1. Chuyển về nhánh `develop`: `git checkout develop`
2. Kéo code mới nhất nhóm vừa làm: `git pull origin develop`
3. Chuyển lại nhánh của bạn: `git checkout feature/ten-cua-ban`
4. Cập nhật code mới từ develop vào nhánh của bạn: `git merge develop` (Nếu có conflict, giải quyết ngay tại nhánh của bạn, không ảnh hưởng ai).

**Cuối giờ làm việc (Lưu code):**
1. Kiểm tra file đã sửa: `git status`
2. Add và Commit: 
   `git add .`
   `git commit -m "feat: hoàn thành API tạo khuyến mãi UC-89"` (Ghi rõ đã làm gì)
3. Đẩy lên nhánh cá nhân: `git push origin feature/ten-cua-ban`

## 3. Quy trình ghép code (Pull Request / Merge Request)
Khi bạn đã làm xong một chức năng và muốn ghép vào `develop` cho cả nhóm dùng:
1. Đẩy code lên nhánh `feature` của bạn trên GitHub.
2. Lên GitHub tạo một **Pull Request (PR)** từ nhánh `feature/...` vào nhánh `develop`.
3. Yêu cầu ít nhất 1 thành viên khác trong nhóm vào xem code (Code Review).
4. Nếu code chạy tốt, không lỗi, người đó sẽ bấm **Approve & Merge** vào `develop`.

---

# Lộ Trình Công Việc Cá Nhân (Personal Roadmap)

Dựa trên việc bạn đã phân tích rất kỹ các Use Case từ hệ thống Rạp/Phòng chiếu (UC-32 -> 41), Soát vé (UC-84 -> 88), và Khuyến mãi (UC-89 -> 94), tôi giả định đây là các module bạn đảm nhận. Lộ trình của bạn nên chia làm 3 Giai đoạn (Sprints):

### Giai đoạn 1: Xây dựng nền tảng Database & Model (Backend)
*   **Mục tiêu:** Khởi tạo các Collection/Table và các quan hệ.
*   **Công việc:**
    1. Định nghĩa Schema/Entity cho `Cinema`, `ScreenRoom`, `Ticket`, `Promotion`, `PricingRule` dựa trên Class Diagram.
    2. Viết các Repository interfaces (MongoDB/JPA).
    3. Tạo dữ liệu mẫu (Seed data) để test.

### Giai đoạn 2: Xây dựng RESTful APIs & Business Logic (Backend)
*   **Mục tiêu:** Hoàn thiện luồng logic đã vẽ trong Sequence Diagram.
*   **Công việc:**
    1. **Module Quản lý Cơ sở vật chất:** Viết API CRUD cho Cinema và ScreenRoom (Nhớ logic khóa ngoại và Soft Delete).
    2. **Module Soát vé:** Viết `TicketValidationService` (Kiểm tra giờ, trùng rạp, đã sử dụng). Viết API quét QR.
    3. **Module Khuyến mãi:** Viết API tạo mã giảm giá. Xây dựng logic `PromotionValidationService` (Xác thực điều kiện áp dụng ở rổ hàng).

### Giai đoạn 3: Kết nối Giao diện (Frontend - React)
*   **Mục tiêu:** Lên UI/UX và ghép API.
*   **Công việc:**
    1. Tạo Form (Vite + Tailwind) để thêm/sửa Rạp chiếu và Phòng chiếu.
    2. Giao diện trang Check-in cho nhân viên (Staff): Có ô nhập mã (hoặc kết nối thư viện quét QR code bằng camera laptop) -> Bắn API -> Hiển thị cảnh báo Đỏ (Lỗi) / Xanh (Hợp lệ).
    3. Giao diện cấu hình Khuyến mãi và Giá động cho Manager.
