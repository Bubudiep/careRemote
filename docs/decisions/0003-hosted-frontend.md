# 0003. Desktop tải frontend từ tên miền

- Trạng thái: Đề xuất
- Ngày: 2026-11-22

## Bối cảnh

Frontend và backend sẽ chạy trên tên miền riêng. UI CRM thay đổi thường xuyên; không muốn phát hành lại desktop cho mỗi thay đổi giao diện.

## Quyết định

- Cửa sổ chính của Tauri tải `APP_URL` (`https://app.<domain>`); dev tải `http://localhost:5173`.
- `capabilities/main.json` khai báo `remote.urls` đúng origin đó và chỉ allowlist các command `client_api`.
- Cùng một build web chạy trên trình duyệt thường; `lib/bridge` tự phát hiện môi trường Tauri.
- Desktop có trang offline cục bộ đơn giản khi không tải được `APP_URL`.

## Phương án đã cân nhắc

- **Đóng gói bundle web trong desktop**: chạy offline, an toàn hơn trước việc domain bị chiếm, nhưng mỗi thay đổi UI phải phát hành desktop.

## Hệ quả

- Web phải tương thích ngược với ít nhất một `protocolV` cũ của desktop.
- Bảo mật domain `app.` trở thành ranh giới tin cậy của IPC → bắt buộc HTTPS, HSTS, CSP chặt, kiểm soát truy cập hosting.

## Khi nào xem xét lại

Khi cần chế độ offline hoàn toàn hoặc yêu cầu bảo mật cao hơn từ khách hàng doanh nghiệp.
