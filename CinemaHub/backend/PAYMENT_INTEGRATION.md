# Thanh toán trên code dev mới — HungNLT

Tích hợp trên nền `origin/dev` commit `e227d11`, nhánh `HungNLT`.

## Phạm vi

Ba task: UC74 Initiate Payment, UC75 Confirm Payment Result, UC77 Process Timeout Payment. Kiểm tra thất bại, quyền sở hữu, chống callback/thanh toán trùng và phát hành vé idempotent là các điều kiện để ba task chạy an toàn. Hoàn tiền tự động và email retry chưa nằm trong thay đổi này.

Luồng hiện tại dùng Booking/Showtime/Seat/Ticket từ dev. Không còn PaymentOrder demo, nút mô phỏng thành công hay endpoint simulate-vnpay-success. Frontend online chỉ chuyển tới VNPay, không gọi confirm để tự tạo vé khi chọn MoMo/Card chưa tích hợp.

## Thiết kế theo cấu trúc mới

- `Payment` được nhúng trong `bookings.payment`. `PaymentRepository` là custom repository dùng MongoTemplate, không tạo một collection payment thứ hai cho cùng giao dịch. Điều này cho phép thay đổi payment và booking nguyên tử trên MongoDB standalone hiện có. Collection `payments` demo cũ không được sử dụng và không bị xóa.
- Một Booking có một giao dịch, transactionId được tạo phía server. Số tiền được chụp từ Booking do backend tính, không đọc amount/status/userId từ request. Promo dùng subtotal trong DB, kiểm tra chủ đơn và không được thay đổi sau khi khởi tạo payment.
- Khởi tạo dùng guard trạng thái PENDING, thời hạn giữ ghế, payment chưa có và revision `version`. Hai request đồng thời trả cùng giao dịch/URL đã lưu.
- Callback/IPN kiểm tra HMAC-SHA512, merchant, amount, currency nếu được provider gửi, responseCode và transactionStatus. Browser return cần đăng nhập đúng chủ đơn; IPN công khai nhưng bắt buộc chữ ký.
- Thành công: cập nhật `booking.status=CONFIRMED` và `payment.status=SUCCESS` trong cùng lần ghi. Thất bại: `CANCELLED` và `FAILED`. Timeout: chỉ `PENDING` hết hạn thành `EXPIRED`. Mỗi bản ghi lỗi không làm dừng batch.
- Callback thành công đến sau EXPIRED/FAILED: giữ trạng thái cuối, đặt `payment.reconciliationRequired=true`; chưa tạo vé, cần hỗ trợ đối soát/hoàn tiền. Không âm thầm báo thành công hoặc chiếm lại ghế.
- Vé online dùng `_id=PAY-<bookingId>`, insert có kiểm tra duplicate, không đổi QR đã phát hành. SUCCESS được lưu trước; scheduler thử lại nếu chưa gắn được ticketId. Email tận dụng code cũ, chỉ lần insert vé mới gửi; chưa có durable email retry.
- `version` là revision CAS thủ công, không dùng @Version để tránh coi các document nhập sẵn thiếu version là bản ghi mới. Booking cũ chưa có version/payment vẫn đọc được.
- Cấu trúc thực tế này thay thế phần Payment collection riêng trong thiết kế SVG trước đây. Không nên code thêm PaymentOrder hoặc lớp trùng chỉ để giống sơ đồ cũ.

## Chạy trên Windows

MongoDB cần chạy tại `127.0.0.1:27017`, database `cinemahub`. Dữ liệu nhập sẵn đã được kiểm tra đọc: 4 movies, 3 cinemas, 5 screen_rooms, 342 seats, 5 showtimes, 4 bookings, 5 tickets, 3 users tại thời điểm kiểm tra. Không import đè database.

Backend, trong thư mục `CinemaHub/backend`:

```powershell
.\mvnw.cmd clean test
.\mvnw.cmd spring-boot:run
```

Frontend, terminal khác trong `CinemaHub/frontend`:

```powershell
npm.cmd install --ignore-scripts
npm.cmd run dev -- --host 127.0.0.1
```

Mở `http://localhost:5173`. Dùng cùng hostname trong lúc login và Return URL, vì localStorage của localhost và 127.0.0.1 khác nhau. Backend cổng 5000. Dùng múi giờ Asia/Ho_Chi_Minh cho JVM khi triển khai vì Booking hiện dùng LocalDateTime.

Seeder tài khoản/dữ liệu đã tắt mặc định để không đổi mật khẩu hoặc thêm dữ liệu lên DB mới mỗi lần chạy. Đăng nhập bằng tài khoản trong DB đã import; không tự tạo tài khoản khi khởi động.

## Cấu hình VNPay sandbox

Đã kiểm tra chuyển tới trang thanh toán VNPay sandbox bằng cấu hình local. Backend mặc định không bật VNPay; tạo payment trả HTTP 503 và không tạo giao dịch. UI thông báo chưa cấu hình. Đây không phải một cổng giả.

Đặt các biến môi trường trong terminal/Run Configuration, không commit giá trị:

- `VNPAY_ENABLED=true`
- `VNPAY_TMN_CODE`: mã merchant được cấp
- `VNPAY_HASH_SECRET`: khóa mới được cấp
- `VNPAY_RETURN_URL=http://localhost:5173/payment-callback` khi chạy local
- `VNPAY_PAY_URL`: mặc định URL sandbox chính thức
- `MAIL_USERNAME`, `MAIL_PASSWORD`: nếu cần thử email xác nhận

Đăng ký IPN URL là `https://<backend-public-host>/api/payment/vnpay-ipn`. VNPay không gọi được localhost; cần môi trường test có URL HTTPS công khai do nhóm cấu hình. Không đặt secret vào frontend, Postman export hoặc chat. Khóa/mail credential từng commit trong code cần được thay/thu hồi; chuyển sang biến môi trường không xóa bí mật trong lịch sử Git.

Tài liệu đối chiếu tham số/chữ ký: https://sandbox.vnpayment.vn/apis/docs/chuyen-doi-thuat-toan/changeTypeHash.html

## API / Postman

Import `payment-integration.postman_collection.json`. Đặt `baseUrl=http://localhost:5000`, `token` từ đăng nhập, `showtimeId`, `seatId` từ DB/giao diện. Các API khách hàng dùng `Authorization: Bearer <token>`.

1. `POST /api/bookings/hold` với `{"showtimeId":"<id thật>","seatIds":["A1"],"customerName":"Tên người nhận","customerEmail":"email của bạn","customerPhone":"số điện thoại"}`. Lưu `id` trả về vào bookingId. Suất phải chưa bắt đầu, ghế ACTIVE và chưa bị giữ/bán.
2. Nếu cần voucher: `POST /api/bookings/apply-promo` với `{"bookingId":"<id>","code":"<mã hợp lệ>","subtotal":0}`. Server dùng subtotal đã lưu, không tin số 0 này.
3. `POST /api/payment/create-vnpay-url` với `{"bookingId":"<id>"}`. Không cấu hình: 503. Có cấu hình: trả paymentUrl, transactionId, totalAmount, expiresAt. Gọi lại trả cùng URL/giao dịch.
4. Mở paymentUrl, làm theo phương thức mà VNPay cung cấp. Return/IPN chứa chữ ký do VNPay tạo; không tự điền status=SUCCESS bằng Postman.
5. `GET /api/payment/transactions/<transactionId>` để xem kết quả và vé. Callback browser dùng `/api/payment/vnpay-callback?<query nguyên vẹn của VNPay>`.
6. Test quyền: bỏ token bị từ chối; tài khoản khác không được sửa voucher/đọc/khởi tạo payment của đơn.
7. Test timeout: tạo một booking thử, chờ hết 10 phút giữ ghế và tối đa 30 giây scheduler. Chỉ booking/payment PENDING được chuyển EXPIRED. Không sửa đơn thật bằng Compass để ép SUCCESS.

## Kiểm tra tự động và giới hạn

`PaymentIntegrationTest` dùng MongoDB thật, database tạm `payment_test_<UUID>` và tự dọn đúng database đó; không sử dụng dữ liệu cinemahub. Kiểm tra concurrent initiate, duplicate callback, success/failure/timeout, callback-timeout race, sai amount/signature/merchant, quyền sở hữu, thiếu config, batch lỗi và idempotent ticket/QR. `PaymentHttpSecurityTest` kiểm tra chặn API giả lập, confirm trực tiếp, counter bypass và unsigned IPN. Test context tắt scheduler/seeder.

Frontend đã build được sau khi cài qrcode.react bị thiếu trong node_modules upstream. Có cảnh báo bundle lớn hơn 500KB; không phải lỗi build.

Chưa kiểm thử end-to-end trên VNPay do chưa có merchant credentials/IPN public. Chưa xác nhận mọi luồng Booking của các thành viên khác: cơ chế giữ ghế upstream vẫn dùng kiểm tra rồi insert, chưa có unique seat reservation nên có rủi ro hai booking khác nhau giữ cùng ghế khi thao tác đồng thời. Cần nhóm Booking xử lý trước production; chống trùng payment ở đây áp dụng cho cùng một booking. Email cũ không có retry bền vững; đối soát/hoàn tiền muộn còn cần xử lý nghiệp vụ riêng.

## MongoDB Compass

Không cần tạo PaymentOrder hoặc đơn demo. Theo dõi `bookings` với filter `{"payment":{"$exists":true}}`; xem payment.status, amount, transactionId, reconciliationRequired. Xem `tickets` theo bookingId. Không xóa collection payments cũ nếu nhóm còn cần lịch sử.

Có thể thêm index cho `bookings`: `(status:1, holdExpiresAt:1)` để scan timeout và unique partial index `payment.transactionId:1` với partial filter `{"payment.transactionId":{"$type":"string"}}` sau khi kiểm tra dữ liệu trùng. Với bộ dữ liệu nhỏ hiện tại, logic CAS không phụ thuộc index để chống hai payment cho cùng booking.

## Điểm và LOC

120 + 120 + 240 = 480 là điểm quy đổi độ khó theo cách nhóm chấm, không phải bắt buộc 480 dòng code. Xem `PAYMENT_LOC.json` cho số dòng code vật lý của các file payment/test hiện tại, loại dòng trống và comment; số này gồm code giữ lại trong file và không được gọi là toàn bộ dòng mới tự viết. Diff so với dev là căn cứ xem phần sửa mới. Không thêm code để đủ số dòng.

Repo upstream đang theo dõi cả target và node_modules. Build/install có thể làm thay đổi file sinh tự động; khi tự commit sau này chỉ chọn source/test/config/docs cần thiết. Không dùng git add . mù quáng. Không có thao tác push trong lần làm này.

Kết quả kiểm tra cuối: 17 tests, 0 failures/errors/skipped; frontend build thành công. Tám file Java payment/test được đo có 565 dòng code vật lý, trong đó 531 dòng thêm hoặc thay so với dev (319 dòng production + 212 dòng test). Không tính dòng trống/comment; chưa cộng sửa Booking/frontend/config. Chạy `python count-payment-loc.py` để đo lại.

## Hạn giữ ghế và thanh toán

Mặc định BOOKING_HOLD_SECONDS=600 (10 phút), PAYMENT_TIMEOUT_SCAN_MS=30000 (quét mỗi 30 giây).
Test timeout nhanh: đặt BOOKING_HOLD_SECONDS=30 và PAYMENT_TIMEOUT_SCAN_MS=1000 trước khi khởi động backend; tạo booking mới.
Payment dùng cùng holdExpiresAt của booking. Đồng hồ của trang VNPay có thể khác; backend không phát hành vé sau hạn giữ ghế.

## Bàn giao task

- UC74 Initiate Payment — Medium, 120 điểm: booking thật, số tiền phía server, quyền sở hữu, khởi tạo VNPay idempotent.
- UC75 Confirm Payment Result — Medium, 120 điểm: xác minh chữ ký/kết quả, chuyển trạng thái nguyên tử, callback lặp không phát hành vé trùng.
- UC77 Process Timeout Payment — Hard, 240 điểm: scheduler hết hạn PENDING, cô lập lỗi từng bản ghi, xử lý tranh chấp callback/timeout.
- Tổng 480 điểm độ khó; không phải yêu cầu 480 dòng code.
- Backend 17 test tự động; frontend build. Luồng thành công sandbox từ đầu tới cuối trên UI vẫn cần nghiệm thu, không đồng nghĩa đã sẵn sàng thu tiền thật.
- Các file Booking/Security dùng chung chỉ phục vụ tích hợp quyền, số tiền và trạng thái thanh toán. Không sửa AuthController/User/Register.
- MAIL_USERNAME và MAIL_PASSWORD phải được cấu hình để các chức năng OTP/email hiện có gửi thư được.