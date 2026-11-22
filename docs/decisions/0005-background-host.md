# 0005. Host chạy nền bằng HostAgent trong Rust

- Trạng thái: Đề xuất
- Ngày: 2026-11-22
- Thay thế: mục 4 của [ADR 0002](0002-zalo-bridge.md)

## Bối cảnh

Host là điểm duy nhất nối cả đội với Zalo. Nếu logic đồng bộ/nhận lệnh nằm trong frontend (cửa sổ main) thì phải giữ cửa sổ mở, và JavaScript trong WebView bị throttle khi ẩn/thu nhỏ → trễ tin, mất lệnh.

## Quyết định

- Chuyển toàn bộ HostRuntime sang **Rust `host_agent`** chạy trong tiến trình chính: kết nối Socket.IO namespace `/host`, đồng bộ outbox (SQLite) qua `POST /sync/batch`, thực hiện `host.command`.
- Rust xác thực bằng **device token** phạm vi host, lưu trong Windows Credential Manager; không giữ token người dùng.
- Cửa sổ main chỉ là UI (như mọi client) + màn trạng thái host; đóng cửa sổ = ẩn xuống tray.
- Chống throttling nhiều lớp cho tab Zalo + watchdog tự phục hồi — chi tiết [HOST_RUNTIME.md](../HOST_RUNTIME.md).
- Tự khởi động cùng Windows ở chế độ nền.

## Phương án đã cân nhắc

- **Giữ HostRuntime ở frontend**: đơn giản hơn nhưng phụ thuộc cửa sổ mở và bị throttle. Loại.
- **Windows Service riêng**: chạy cả khi chưa đăng nhập Windows, nhưng service không hiển thị được WebView (session 0) → không chạy được Zalo Web. Loại.

## Hệ quả

- Rust cần Socket.IO client (`rust_socketio` async) và HTTP client (`reqwest`); contract `realtime/host` phải có struct Rust + fixture.
- Backend cần cấp/thu hồi device token và namespace `/host` riêng.
- Logic gửi tin không còn đi qua frontend host → người dùng trên máy host cũng trả lời qua API như mọi client.

## Khi nào xem xét lại

Nếu đo thấy WebView2 vẫn bị throttle không khắc phục được → cân nhắc giữ tab Zalo ở phương án "ngoài màn hình" vĩnh viễn hoặc nhúng tab vào cửa sổ main.
