# Backlog

Mã task: `<milestone>-<số>`. Trạng thái: `[ ]` chưa làm · `[~]` đang làm · `[x]` xong. Mỗi task ≈ 1 PR (≤ 2 ngày). Cột **Phụ thuộc** liệt kê task phải xong trước.

Khi bắt đầu task: đổi sang `[~]` và ghi người phụ trách `@tên`. Khi xong: `[x]` + link PR.

## M0 — Khởi động

| | Mã | Task | Phụ thuộc |
|---|---|---|---|
| [x] | M0-1 | Bộ khung thư mục + tài liệu dự án | — |
| [ ] | M0-2 | Chốt phạm vi v1.0 với chủ sản phẩm (PROJECTS.md) | M0-1 |
| [ ] | M0-3 | Duyệt ADR 0001–0004 | M0-1 |
| [ ] | M0-4 | Mua/cấu hình tên miền, DNS `app.`, `api.`, `staging` | — |

## M1 — Nền tảng monorepo

| | Mã | Task | Phụ thuộc |
|---|---|---|---|
| [ ] | M1-1 | Root `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `.nvmrc`, `rust-toolchain.toml` | M0-3 |
| [ ] | M1-2 | `packages/config`: tsconfig base, eslint, prettier | M1-1 |
| [ ] | M1-3 | Khởi tạo `apps/api` (Nest CLI) + script `dev/build/test/lint` | M1-2 |
| [ ] | M1-4 | Khởi tạo `apps/web` (Vite React TS) + Tailwind + router | M1-2 |
| [ ] | M1-5 | Khởi tạo `apps/desktop` (Tauri 2) trỏ tới Vite dev | M1-4 |
| [ ] | M1-6 | Khởi tạo `apps/desktop/zalo-inject` (build bằng esbuild → 1 file IIFE) | M1-5 |
| [ ] | M1-7 | `packages/contracts` với zod, export cho web/api | M1-2 |
| [ ] | M1-8 | CI: lint + typecheck + test + build (Node & Rust: `cargo fmt/clippy/test`) | M1-3..7 |
| [ ] | M1-9 | Cập nhật GUIDE.md với lệnh thực tế | M1-8 |

## M2 — Backend lõi

| | Mã | Task | Phụ thuộc |
|---|---|---|---|
| [ ] | M2-1 | `config` module: validate env bằng zod, fail-fast | M1-3 |
| [ ] | M2-2 | Prisma + `database` module, migration đầu: users, workspaces, members, refresh_tokens | M2-1 |
| [ ] | M2-3 | `health` (liveness/readiness) | M2-2 |
| [ ] | M2-4 | `auth`: register/login/refresh/logout, JWT + cookie refresh xoay vòng | M2-2 |
| [ ] | M2-5 | `workspaces`: CRUD, mời thành viên, guard `WorkspaceGuard` + `@Roles()` | M2-4 |
| [ ] | M2-6 | `common`: exception filter định dạng lỗi chuẩn, logging interceptor có che dữ liệu, requestId | M2-1 |
| [ ] | M2-7 | OpenAPI tại `/api/docs`, versioning `/api/v1` | M2-4 |
| [ ] | M2-8 | Test e2e: chưa xác thực, sai role, truy cập chéo workspace | M2-5 |

## M3 — Desktop shell + Frontend lõi

| | Mã | Task | Phụ thuộc |
|---|---|---|---|
| [ ] | M3-1 | Web: layout app (sidebar, topbar), routing, trang lỗi/404 | M1-4 |
| [ ] | M3-2 | Web: `lib/api` client có kiểu, TanStack Query, refresh token tự động | M2-4, M1-7 |
| [ ] | M3-3 | Web: đăng nhập/đăng ký, chọn workspace | M3-2 |
| [ ] | M3-4 | Web: `lib/bridge` — phát hiện Tauri, wrapper `invoke/listen` có kiểu, mock cho trình duyệt | M1-7 |
| [ ] | M3-5 | Desktop: cửa sổ chính tải `APP_URL` theo môi trường; capability `main.json` cho remote origin | M1-5 |
| [ ] | M3-6 | Desktop: `app_info`, `diag_snapshot`; web hiển thị trang Chẩn đoán | M3-4, M3-5 |
| [ ] | M3-7 | Desktop: tray, single-instance, ghi nhớ kích thước cửa sổ | M3-5 |
| [ ] | M3-8 | Desktop: màn thiết lập chọn chế độ Host/Client (`app_set_mode`), sinh `deviceId` | M3-6 |

## M4 — Zalo bridge + chạy nền (host)

| | Mã | Task | Phụ thuộc |
|---|---|---|---|
| [ ] | M4-1 | Contracts `bridge/`: envelope, ZaloStatus/HostStatus/Thread/Message, BridgeError + fixtures | M1-7 |
| [ ] | M4-2 | Rust `zalo/window`: tab `zalo` duy nhất, profile cố định, cờ Chromium chống throttling, 2 chiến lược ẩn (`hide`/`offscreen`) | M3-8 |
| [ ] | M4-3 | Rust `zalo/session`: trạng thái phiên, profile tài khoản, phát hiện đổi tài khoản Zalo | M4-2 |
| [ ] | M4-4 | zalo-inject `transport` + Rust `bridge_ingest` (capability `zalo.json`, validate, giới hạn kích thước/tần suất) | M4-1, M4-2 |
| [ ] | M4-5 | zalo-inject `observers/auth` → `zalo://status`; Web Lock keepalive; `inject.heartbeat` (driftMs) | M4-4 |
| [ ] | M4-6 | zalo-inject `observers/threads` + `observers/messages` (MutationObserver) | M4-5 |
| [ ] | M4-7 | Rust `storage`: SQLite outbox + bảng commandId đã thực hiện | M4-4 |
| [ ] | M4-8 | zalo-inject `actions/sendMessage` qua `window.__zc.dispatch` → `action.result` | M4-6 |
| [ ] | M4-9 | zalo-inject `actions/loadHistory`, `actions/openThread` | M4-6 |
| [ ] | M4-10 | `background/watchdog`: ping, reload, tạo lại tab, reload định kỳ; `host://recovered`; `adapter_error` | M4-5 |
| [ ] | M4-11 | `app/tray` + close-to-tray + `--background` + `tauri-plugin-autostart` + single-instance | M3-7 |
| [ ] | M4-12 | `background/power`: tắt EcoQoS (process chính + tiến trình WebView2 nếu cần), keep-awake, xử lý sleep/resume | M4-2 |
| [ ] | M4-13 | Benchmark chạy nền 2 giờ theo [HOST_RUNTIME.md §5](HOST_RUNTIME.md#5-đo-lường--tiêu-chí-nghiệm-thu), chốt chiến lược ẩn | M4-10, M4-12 |
| [ ] | M4-14 | `client_api`: `host_status`, `zalo_show/hide/logout`, `background_get/set`, `diag_snapshot` | M4-3 |
| [ ] | M4-15 | Web `features/zalo-host`: thiết lập host, QR, trạng thái, cài đặt chạy nền | M4-14, M3-4 |
| [ ] | M4-16 | Checklist kiểm thử thủ công `docs/runbooks/zalo-adapter-check.md` | M4-10 |

## M5 — Host relay + CRM nghiệp vụ

| | Mã | Task | Phụ thuộc |
|---|---|---|---|
| [ ] | M5-1 | Migration: zalo_accounts (1–1 workspace), host_devices, host_commands, customers, conversations, messages, sync_cursors | M2-2 |
| [ ] | M5-2 | API `realtime`: namespace `/realtime` (JWT) + web `lib/realtime` | M2-4 |
| [ ] | M5-3 | API `zalo-host`: cấp/thu hồi device token, namespace `/host`, lease, heartbeat/presence, takeover, `zalo_host.status` | M5-1, M5-2 |
| [ ] | M5-4 | API `sync/batch` (device token + lease, upsert idempotent, tự tạo customer từ zalo_uid) | M5-3 |
| [ ] | M5-5 | Rust `host_agent/credentials` + `connection` (rust_socketio, heartbeat, reconnect backoff) + `host_configure/unlink` | M5-3, M4-14 |
| [ ] | M5-6 | Rust `host_agent/sync`: outbox SQLite → `/sync/batch` (gom batch, retry) | M5-4, M5-5, M4-7 |
| [ ] | M5-7 | API hàng đợi `host_commands`: tạo khi client gửi tin, dispatcher, TTL, rate limit, đẩy lại khi host kết nối lại | M5-3 |
| [ ] | M5-8 | Rust `host_agent/executor`: `host.command` → action → `host.command_result`, tuần tự, chống trùng `commandId`, `host_pause/resume` | M5-7, M4-8 |
| [ ] | M5-9 | Inbox: danh sách hội thoại, bộ lọc, khung chat, trả lời qua host (luồng 4.3), badge host offline, tải lịch sử | M5-8 |
| [ ] | M5-10 | Khách hàng: danh sách, tìm kiếm, chi tiết, sửa, gộp; panel khách hàng cạnh chat | M5-4 |
| [ ] | M5-11 | Nhãn + gắn nhãn khách hàng/hội thoại | M5-10 |
| [ ] | M5-12 | Phân công hội thoại + lọc "của tôi"/"chưa giao" | M5-9 |
| [ ] | M5-13 | Ghi chú + timeline activities | M5-10 |
| [ ] | M5-14 | Nhắc việc + thông báo (desktop notification qua Tauri) | M5-10 |
| [ ] | M5-15 | Trả lời nhanh `/shortcut` | M5-9 |
| [ ] | M5-16 | Báo cáo tổng quan | M5-12 |
| [ ] | M5-17 | Audit log (cấp/thu hồi device, takeover, đổi tài khoản Zalo, xuất dữ liệu) + màn xem | M5-10 |
| [ ] | M5-18 | Kiểm thử tích hợp 1 host (cửa sổ đóng, khóa màn hình) + 2 client: gửi/nhận, host offline, takeover, không gửi trùng | M5-9, M4-13 |

## M6 — Phát hành v1.0

| | Mã | Task | Phụ thuộc |
|---|---|---|---|
| [ ] | M6-1 | Mẫu nginx `infra/deploy/nginx`, deploy staging API + Web | M5 |
| [ ] | M6-2 | Ký bộ cài Windows, Tauri updater + `latest.json` | M5 |
| [ ] | M6-3 | Log tập trung + giám sát uptime + cảnh báo lỗi (Sentry hoặc tương đương) | M6-1 |
| [ ] | M6-4 | Sao lưu DB tự động + diễn tập khôi phục | M6-1 |
| [ ] | M6-5 | Runbook: sự cố Zalo adapter, host offline/treo, API down, rollback migration | M6-3 |
| [ ] | M6-6 | Review bảo mật theo checklist SECURITY.md | M6-1..5 |
| [ ] | M6-7 | Pilot với 1 đội CSKH thật, thu phản hồi | M6-6 |
| [ ] | M6-8 | Deploy production + phát hành desktop v1.0.0 | M6-7 |

## Definition of Done (áp dụng mọi task)

- Đạt tiêu chí nghiệm thu, lint/typecheck/test xanh trên CI.
- UI có trạng thái loading / rỗng / lỗi / mất kết nối.
- Contract thay đổi → cập nhật zod + Rust + fixture + tài liệu cùng PR.
- Thay đổi DB có migration; thay đổi env có cập nhật `.env.example`.
- Không log dữ liệu nhạy cảm; quyền được kiểm tra phía server.
- Task phụ thuộc Zalo: đã chạy checklist thủ công, không chỉ demo một lần.
