# 0002. Tích hợp Zalo qua tab Zalo Web ẩn + `client_api`

- Trạng thái: Đề xuất
- Ngày: 2026-11-22

## Bối cảnh

Khách hàng dùng Zalo cá nhân để chăm sóc khách; không có API chính thức cho tài khoản cá nhân. Zalo Web (`chat.zalo.me`) chạy được trong WebView.

## Quyết định

1. Desktop ở chế độ Host tạo **một WebView duy nhất** (`zalo`) cho **một tài khoản Zalo**, thư mục profile cố định, hiện khi cần đăng nhập, **ẩn** khi đã kết nối, tắt background throttling. Nhân viên khác làm việc qua backend ([ADR 0004](0004-host-client-model.md)).
2. Inject `zalo-inject.js` qua `initialization_script`. Script quan sát trang và thực hiện thao tác theo lệnh; mọi selector gom trong `selectors/` có version.
3. Rust là cầu nối duy nhất: nhận `bridge_ingest` từ tab Zalo, chuẩn hóa, ghi outbox; chuyển lệnh thành action cho tab Zalo; `client_api` cung cấp trạng thái/điều khiển cho UI.
4. ~~Frontend của host chịu trách nhiệm nói chuyện với backend.~~ **Bị thay thế bởi [ADR 0005](0005-background-host.md)**: HostAgent trong Rust đồng bộ và nhận lệnh, dùng device token phạm vi host.
5. Cookie/phiên Zalo không rời khỏi profile WebView.

## Phương án đã cân nhắc

- **Rust tự đồng bộ lên backend**: ban đầu để sau v1.0; đã được chọn ở ADR 0005 vì yêu cầu chạy nền.
- **Thư viện Zalo không chính thức chạy ở server** (đăng nhập phiên trên server): gom phiên của nhiều người dùng lên server — rủi ro bảo mật và rủi ro khóa tài khoản cao. Loại.
- **Zalo OA API chính thức**: an toàn nhưng chỉ cho Official Account, không thay được Zalo cá nhân. Bổ sung sau như kênh thứ hai.

## Hệ quả

- Phụ thuộc giao diện Zalo Web → cần quy trình hotfix desktop nhanh và checklist kiểm thử adapter.
- Outbox bảo đảm không mất dữ liệu khi mất kết nối.

## Khi nào xem xét lại

Khi người dùng cần đồng bộ lúc đóng UI, hoặc khi có API chính thức phù hợp.
