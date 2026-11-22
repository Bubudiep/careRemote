# Dự án ZaloCare

## Mục tiêu

Giúp đội CSKH/bán hàng quản lý khách hàng trên Zalo cá nhân như một CRM: không sót tin, biết ai đang phụ trách khách nào, lưu lại lịch sử và ghi chú, đo được hiệu suất phản hồi.

## Người dùng

| Vai trò | Nhu cầu chính |
|---|---|
| Nhân viên CSKH (agent) | Hộp thư hợp nhất, trả lời nhanh, xem hồ sơ khách ngay cạnh hội thoại, nhắc việc |
| Trưởng nhóm (admin) | Phân công, theo dõi hội thoại chưa trả lời, báo cáo theo nhân viên |
| Chủ doanh nghiệp (owner) | Quản lý workspace, thành viên, tài khoản Zalo, dữ liệu khách hàng tập trung |

## Phạm vi bản phát hành đầu (v1.0)

**Mô hình:** 1 workspace = 1 tài khoản Zalo = 1 **host** (app desktop giữ tab Zalo ẩn) + nhiều **client** (nhân viên trên web/desktop) cùng chăm khách qua backend. Xem [ADR 0004](decisions/0004-host-client-model.md).

**Trong phạm vi:** đăng nhập ZaloCare; workspace + thành viên; thiết lập host với 1 tài khoản Zalo qua tab ẩn; client trả lời khách thông qua host; trạng thái host online/offline; đồng bộ hội thoại & tin nhắn văn bản/ảnh; inbox (lọc theo trạng thái, nhân viên, nhãn); trả lời từ ZaloCare; hồ sơ khách hàng, nhãn, ghi chú, phân công, nhắc việc, trả lời nhanh; báo cáo cơ bản; desktop Windows (macOS sau).

**Ngoài phạm vi v1.0:** gửi hàng loạt/broadcast, chatbot tự động, Zalo OA/ZNS chính thức, app mobile, lưu trữ file đính kèm trên server, thanh toán.

## Milestones

| Mã | Tên | Kết quả | Phụ thuộc |
|---|---|---|---|
| **M0** | Khởi động | Phạm vi, ADR nền tảng, tài liệu, bộ khung thư mục | — |
| **M1** | Nền tảng monorepo | pnpm workspace chạy được `dev/lint/test/build` cho 3 app; CI xanh | M0 |
| **M2** | Backend lõi | Auth, workspace, phân quyền, health, Prisma migration, OpenAPI | M1 |
| **M3** | Desktop shell + Frontend lõi | Tauri tải `app.<domain>`/Vite; layout, đăng nhập, `lib/bridge`; `app_info` chạy end-to-end | M1 |
| **M4** | Zalo bridge + chạy nền | Tab Zalo ẩn, QR, observer/action, outbox SQLite; tray, autostart, chống throttling, watchdog; benchmark chạy nền | M3 |
| **M5** | Host relay + CRM | HostAgent Rust (device token, socket `/host`, sync, executor), lease/presence, hàng đợi lệnh client → host, inbox, khách hàng, nhãn, phân công, ghi chú, nhắc việc, trả lời nhanh, realtime | M2, M4 |
| **M6** | Phát hành v1.0 | Deploy domain, ký bộ cài, auto-update, monitoring, sao lưu, runbook, pilot với khách hàng thật | M5 |

### Định nghĩa hoàn thành từng milestone

- **M1:** thành viên mới clone → làm theo [GUIDE.md](GUIDE.md) → chạy được cả 3 app trong < 30 phút.
- **M2:** endpoint được bảo vệ từ chối request không hợp lệ; test truy cập chéo workspace đạt; `/health/ready` phản ánh trạng thái DB.
- **M3:** cùng một build web chạy được trên trình duyệt (bridge tắt) và trong desktop (bridge bật).
- **M4:** khởi động Windows → app tự chạy nền, tab Zalo ẩn, giữ phiên; đóng cửa sổ + khóa màn hình 2 giờ vẫn đạt ngưỡng benchmark trong [HOST_RUNTIME.md](HOST_RUNTIME.md#5-đo-lường--tiêu-chí-nghiệm-thu); tab treo tự phục hồi.
- **M5:** 1 host + 2 client trên 3 máy: client trả lời → tin đến điện thoại khách qua host < 3 giây; tắt host → client thấy "host offline", tin xếp hàng và gửi khi host bật lại (trong TTL), không gửi trùng.
- **M6:** bản cài đã ký cài được trên máy sạch; cập nhật tự động hoạt động; khôi phục từ backup đã được diễn tập.

## Lộ trình sau v1.0

- macOS/Linux build, đa ngôn ngữ.
- Zalo OA API chính thức làm kênh thứ hai (giảm rủi ro phụ thuộc Zalo Web).
- Lưu trữ file đính kèm (S3-compatible), tìm kiếm full-text tiếng Việt.
- Pipeline bán hàng nâng cao, custom fields, import/export Excel.
- Nhiều tài khoản Zalo trong một workspace (nhiều host) — xem [ADR 0004](decisions/0004-host-client-model.md).

## Rủi ro chính

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| Zalo Web đổi giao diện làm hỏng adapter | Cao | Selector tập trung + version, cảnh báo `adapter_error`, test thủ công định kỳ, phát hành hotfix nhanh (UI web không cần cài lại) |
| Tài khoản Zalo bị hạn chế | Cao | Rate limit, không broadcast, hành vi giống người dùng thật |
| Máy host tắt/mất mạng → cả đội không gửi được tin | Cao | Cảnh báo host offline cho mọi client, hàng đợi có TTL, khuyến nghị host chạy trên máy luôn bật, takeover nhanh sang máy khác |
| WebView ẩn bị throttle/ngủ | Cao | Logic host trong Rust; 5 lớp chống throttling + watchdog; benchmark bắt buộc (M4-13) — [HOST_RUNTIME.md](HOST_RUNTIME.md) |
| Dữ liệu cá nhân bị lộ | Cao | Xem [SECURITY.md](SECURITY.md) |
