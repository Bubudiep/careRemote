# Host chạy nền

Host phải chạy **24/7, kể cả khi đóng cửa sổ, thu nhỏ, khóa màn hình**, và không bị Windows/WebView2 làm chậm. Tài liệu này mô tả cách đạt được điều đó. Quyết định: [ADR 0005](decisions/0005-background-host.md).

## 1. Ai chạy cái gì

```text
Tiến trình zalocare.exe (Rust, tokio)
├─ HostAgent           ← kết nối backend, đồng bộ, thực hiện lệnh   (KHÔNG phụ thuộc cửa sổ nào)
├─ Watchdog            ← theo dõi tab Zalo, tự phục hồi
├─ Power guard         ← chống throttling / chống ngủ
├─ Tray                ← icon khay hệ thống, menu
├─ Cửa sổ main         ← UI (có thể đóng; đóng = ẩn xuống tray)
└─ Cửa sổ zalo         ← WebView chat.zalo.me + zalo-inject (luôn sống khi ở chế độ host)
```

Logic quan trọng (sync, nhận lệnh, gửi tin) nằm trong **Rust** — tiến trình native không bị trình duyệt throttle. Chỉ phần thật sự phải chạy trong trang Zalo (observer, action) nằm trong WebView, và phần đó được bảo vệ bằng các lớp ở mục 3.

## 2. Vòng đời ứng dụng

| Sự kiện | Hành vi |
|---|---|
| Khởi động Windows | `tauri-plugin-autostart` mở app với `--background` → không hiện cửa sổ main, chỉ tray + tab Zalo + HostAgent |
| Bấm X cửa sổ main | `prevent_close` → ẩn xuống tray. Lần đầu hiện thông báo "ZaloCare vẫn chạy nền" |
| Menu tray | Mở ZaloCare · Hiện tab Zalo · Trạng thái host · Tạm dừng host · Thoát |
| Thoát | Chỉ qua tray/menu, hỏi xác nhận vì client khác sẽ không gửi được tin |
| Mở app lần 2 | `tauri-plugin-single-instance` → đưa cửa sổ main lên, không tạo tiến trình mới |
| Máy ngủ → thức | Bắt sự kiện resume → kiểm tra tab Zalo, kết nối lại socket ngay (không chờ backoff) |
| Đổi mạng / mất mạng | Socket tự kết nối lại (backoff 1s → 30s); outbox giữ dữ liệu |

## 3. Chống throttling — nhiều lớp

Không có một công tắc duy nhất trên Windows, nên dùng nhiều lớp. **Mỗi lớp phải được đo (mục 5) trước khi chốt.**

### Lớp 1 — Cờ Chromium cho WebView Zalo (Windows/WebView2)

Tạo tab Zalo bằng `WebviewWindowBuilder::additional_browser_args(...)`:

```text
--disable-background-timer-throttling
--disable-renderer-backgrounding
--disable-backgrounding-occluded-windows
--disable-features=IntensiveWakeUpThrottling,CalculateNativeWinOcclusion,msWebOOUI,msPdfOOUI,msSmartScreenProtection
```

- Ghi đè args sẽ **mất args mặc định của Tauri**, nên phải giữ lại `msWebOOUI,msPdfOOUI,msSmartScreenProtection`.
- Mọi WebView dùng chung một thư mục dữ liệu phải có cùng args. Tab Zalo dùng thư mục profile riêng nên không ảnh hưởng cửa sổ main.
- macOS: dùng thêm cấu hình `backgroundThrottling: "disabled"` của Tauri (chỉ có hiệu lực trên macOS).

### Lớp 2 — Cách "ẩn" tab Zalo

`hide()` (SW_HIDE) có thể khiến WebView2 coi trang là không hiển thị và giảm ưu tiên. Có hai phương án, chọn theo kết quả đo:

| Phương án | Cách làm | Ghi chú |
|---|---|---|
| A. Hide thật | `window.hide()` + cờ ở lớp 1 | Đơn giản, cần đo xem timer có bị chậm không |
| B. Ẩn ngoài màn hình *(dự phòng)* | Cửa sổ vẫn visible nhưng đặt ở toạ độ ngoài màn hình, `skip_taskbar(true)`, `focused(false)`, không viền | WebView luôn ở trạng thái visible → không bị coi là nền |

### Lớp 3 — Giữ trang không bị "đóng băng" (trong zalo-inject)

- Giữ một Web Lock suốt vòng đời trang: `navigator.locks.request("zc-keepalive", () => new Promise(() => {}))`. Chromium không đóng băng trang đang giữ lock.
- Observer dựa vào **MutationObserver/sự kiện**, không dựa vào `setInterval` dày → kể cả khi bị throttle nhẹ vẫn không trễ tin.
- Heartbeat gửi lên Rust mỗi 5s, kèm độ trễ thực tế của timer (`drift`) để biết trang có đang bị throttle hay không.

### Lớp 4 — Windows power throttling (EcoQoS)

Windows 11 có thể đưa tiến trình nền vào "Efficiency mode". `background/power` gọi:

- `SetProcessInformation(ProcessPowerThrottling, ControlMask = EXECUTION_SPEED, StateMask = 0)` cho tiến trình chính → tắt EcoQoS.
- Áp dụng tương tự cho các tiến trình con `msedgewebview2.exe` của tab Zalo (lấy PID qua `ICoreWebView2Environment::GetProcessInfos`) nếu đo thấy cần.
- Tùy chọn **"Giữ máy không ngủ khi đang là host"** (mặc định bật): `SetThreadExecutionState(ES_CONTINUOUS | ES_SYSTEM_REQUIRED)`. Màn hình vẫn được tắt, chỉ máy không sleep.

### Lớp 5 — Watchdog tự phục hồi

| Tình huống | Phát hiện | Xử lý |
|---|---|---|
| Trang treo / JS chết | Mất heartbeat > 30s | `eval` ping → không trả lời → reload tab |
| Renderer crash | Reload thất bại 3 lần | Đóng và tạo lại cửa sổ `zalo` |
| Bị Zalo đăng xuất | `session` báo `login_required` | Báo `host.status` cho backend + thông báo tray "Cần quét lại QR" |
| Rò rỉ bộ nhớ lâu ngày | RAM tab vượt ngưỡng hoặc chạy > 24h | Reload chủ động vào giờ thấp điểm (cấu hình), chỉ khi không có lệnh đang chạy |
| Selector không khớp | `adapter_error` | Báo backend → admin thấy cảnh báo; không reload liên tục |

Mọi lần phục hồi ghi vào `diag_snapshot` (số lần reload, lý do) và gửi trong heartbeat lên backend.

## 4. HostAgent (Rust)

```text
host_agent/
├─ credentials/   đọc/ghi device token trong Windows Credential Manager (crate keyring)
├─ connection/    Socket.IO client tới api.<domain>/host, heartbeat 15s, reconnect backoff
├─ sync/          đọc outbox (SQLite) → POST /sync/batch → xóa khi backend xác nhận
└─ executor/      nhận host.command → chuyển thành action cho zalo-inject → trả host.command_result
```

- Xác thực bằng **device token** (chỉ có quyền host: sync + kênh lệnh), không phải token đăng nhập của người dùng. Token cấp khi admin thiết lập host trên UI, thu hồi được từ backend.
- Outbox lưu ở SQLite (`storage/`) → tắt app đột ngột, mất điện cũng không mất tin chưa đồng bộ.
- `executor` ghi `commandId` đã thực hiện vào SQLite → mất kết nối giữa chừng không gửi trùng.
- Executor chạy tuần tự từng lệnh gửi tin, có khoảng nghỉ ngẫu nhiên ngắn giữa các tin để giống thao tác người.

## 5. Đo lường & tiêu chí nghiệm thu

Kịch bản đo (task M4-13), chạy trên Windows 11, máy dùng pin và cắm sạc:

1. Host chạy, cửa sổ main đóng, tab Zalo ẩn, khóa màn hình 2 giờ.
2. Mỗi 5 phút gửi tin từ điện thoại khác tới tài khoản Zalo, và gửi lệnh từ client.

| Chỉ số | Ngưỡng đạt |
|---|---|
| Độ trễ tin đến (Zalo → backend) | p95 < 3s |
| Độ trễ lệnh gửi (client → tin đi) | p95 < 5s |
| Heartbeat `drift` của trang | < 2s |
| Tin bị mất | 0 |
| CPU trung bình khi rảnh | < 3% |

Kết quả đo ghi vào `docs/runbooks/host-background-benchmark.md`, dùng để chọn phương án lớp 2 và quyết định có cần lớp 4 cho tiến trình con hay không.

## 6. Khuyến nghị cho máy host

- Máy luôn cắm điện, mạng ổn định; Windows Power mode: *Best performance*.
- Tắt sleep khi cắm điện (app có tùy chọn giữ máy không ngủ, nhưng chính sách công ty có thể ghi đè).
- Không đăng nhập cùng tài khoản Zalo trên trình duyệt khác (Zalo có thể đá phiên web).
