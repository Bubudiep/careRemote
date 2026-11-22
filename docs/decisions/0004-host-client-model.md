# 0004. Mô hình Host – Client (1 tài khoản Zalo, nhiều nhân viên)

- Trạng thái: Đề xuất
- Ngày: 2026-11-22

## Bối cảnh

Doanh nghiệp thường có **một** tài khoản Zalo chăm sóc khách hàng nhưng nhiều nhân viên cần cùng trả lời. Phiên Zalo Web chỉ nên chạy ở một nơi để tránh bị đăng xuất/khóa.

## Quyết định

- **1 app desktop = 1 tài khoản Zalo.** Không hỗ trợ nhiều tài khoản trong một app.
- **1 workspace = 1 tài khoản Zalo = 1 host đang hoạt động.** Muốn quản lý tài khoản Zalo khác → tạo workspace khác.
- Host chạy nền bằng HostAgent Rust ([ADR 0005](0005-background-host.md)) và giữ **lease** trên backend (socket `/host` + heartbeat). Host thứ hai cùng workspace bị từ chối; owner/admin có thể takeover (host cũ nhận `host.revoked` và dừng tab Zalo).
- Client (web/desktop chế độ client) làm mọi thao tác qua backend; lệnh Zalo được đưa vào bảng `host_commands` và đẩy tới host qua namespace `/host`, phòng `host:<workspaceId>`.
- Host xác nhận kết quả qua `host.command_result`; backend cập nhật và phát realtime cho mọi client.
- Tài khoản Zalo gắn với workspace lần đầu là cố định; host đăng nhập tài khoản khác sẽ bị chặn đồng bộ cho tới khi admin xác nhận đổi.

## Phương án đã cân nhắc

- **Client kết nối P2P/LAN tới host**: không cần backend trung chuyển nhưng vướng NAT, bảo mật, không dùng được từ xa. Loại.
- **Mỗi nhân viên một tab Zalo cùng tài khoản**: Zalo giới hạn phiên web đồng thời, dễ bị đăng xuất. Loại.

## Hệ quả

- Host là điểm lỗi đơn: máy host tắt → client không gửi được (vẫn xem/ghi chú được). Cần cảnh báo host offline, khuyến nghị đặt host trên máy luôn bật.
- Backend cần hàng đợi lệnh có trạng thái, TTL, rate limit và idempotency.

## Khi nào xem xét lại

Khi cần nhiều tài khoản Zalo trong một workspace (bỏ ràng buộc 1–1, cho phép nhiều host, mỗi host một tài khoản).
