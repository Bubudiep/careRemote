# Hướng dẫn phát triển

> Các lệnh dưới đây là **dự kiến** — sẽ chạy được sau M1 (xem [TASKS.md](TASKS.md)). Khi M1-9 hoàn thành, cập nhật lại file này theo lệnh thực tế.

## 1. Công cụ cần cài

| Công cụ | Phiên bản | Ghi chú |
|---|---|---|
| Node.js | LTS (ghim trong `.nvmrc`) | |
| pnpm | ghim trong `packageManager` của root `package.json` | `corepack enable` |
| Rust | stable (ghim trong `rust-toolchain.toml`) | `rustup` |
| PostgreSQL | 16+ | Cài trực tiếp trên máy |
| Tauri prerequisites | theo [tauri.app](https://tauri.app/start/prerequisites/) | Windows: MSVC Build Tools + WebView2 (có sẵn trên Win 11) |
| VS Code extensions | rust-analyzer, ESLint, Prettier, Prisma, Tauri | |

## 2. Cài đặt lần đầu

```bash
git clone <repo> zaloCare && cd zaloCare
pnpm install

# Database
psql -U postgres -c "CREATE ROLE zalocare WITH LOGIN PASSWORD 'dev-password';"
psql -U postgres -c "CREATE DATABASE zalocare OWNER zalocare;"

# Env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

pnpm --filter api db:migrate        # prisma migrate dev
pnpm --filter api db:seed           # dữ liệu mẫu (workspace + 2 user)
```

## 3. Chạy local

| Mục đích | Lệnh | Địa chỉ |
|---|---|---|
| API + Web cùng lúc | `pnpm dev` | API `:3000`, Web `:5173` |
| Chỉ API | `pnpm --filter api dev` | `http://localhost:3000/api/v1`, docs `/api/docs` |
| Chỉ Web | `pnpm --filter web dev` | `http://localhost:5173` |
| Desktop | `pnpm --filter desktop tauri dev` | Mở cửa sổ chính tải `:5173` |
| Build zalo-inject (watch) | `pnpm --filter zalo-inject dev` | Rust nạp lại khi `tauri dev` rebuild |

### Thử mô hình Host – Client trên một máy

1. `pnpm dev` (API + Web).
2. `pnpm --filter desktop tauri dev` → chọn chế độ **Host** → quét QR bằng tài khoản Zalo thử nghiệm.
3. Mở `http://localhost:5173` trên trình duyệt (có thể mở thêm cửa sổ ẩn danh) và đăng nhập bằng user khác cùng workspace → đây là các **client**.
4. Gửi tin từ client → kiểm tra tin đi qua host.
5. Đóng cửa sổ main của desktop (app vẫn ở tray) → gửi/nhận tin vẫn phải chạy bình thường.
6. Thoát hẳn từ menu tray → client phải hiện "host offline" và tin chuyển `queued`; mở lại app → tin tồn đọng được gửi.

Desktop ở dev cần Web đang chạy. Tab Zalo vẫn tải `https://chat.zalo.me` thật — **dùng tài khoản Zalo thử nghiệm**, không dùng tài khoản đang chăm sóc khách hàng thật khi phát triển.

## 4. Lệnh thường dùng

```bash
pnpm lint            # eslint + cargo clippy
pnpm typecheck
pnpm test            # vitest/jest + cargo test
pnpm build           # build tất cả
pnpm --filter api db:studio          # Prisma Studio
pnpm --filter api db:migrate --name add_reminders
pnpm --filter desktop tauri build    # bộ cài
```

## 5. Làm việc với từng phần

- **Thêm module API**: `nest g resource modules/<tên>` → đặt DTO dùng chung vào `packages/contracts/src/http` → thêm guard workspace → test e2e quyền.
- **Thêm command bridge**: theo thứ tự `contracts/bridge` → fixture → struct Rust + `#[tauri::command]` → thêm vào capability `main.json` → wrapper trong `web/src/lib/bridge` → cập nhật [CLIENT_API.md](CLIENT_API.md).
- **Sửa selector Zalo**: chỉ sửa trong `zalo-inject/src/selectors`, tăng `SELECTOR_VERSION`, chạy checklist `docs/runbooks/zalo-adapter-check.md`.
- **Debug tab Zalo**: `zalo_show` từ trang Chẩn đoán để hiện tab; bản dev bật devtools (chuột phải → Inspect).

## 6. Xử lý sự cố

| Triệu chứng | Kiểm tra |
|---|---|
| API không khởi động, lỗi env | Thông báo validate config chỉ rõ biến thiếu; so với `.env.example` |
| `P1001 Can't reach database` | Dịch vụ PostgreSQL đang chạy? `DATABASE_URL` đúng host/port/mật khẩu? |
| Desktop màn trắng | Web dev server đã chạy chưa? `APP_URL` đúng? Xem log Tauri trong terminal |
| `invoke` báo "not allowed" | Command chưa có trong capability, hoặc origin chưa nằm trong `remote.urls` |
| Tab Zalo hỏi QR mỗi lần mở | Profile WebView bị xóa hoặc thư mục data không cố định — kiểm tra `zalo/window` |
| Không nhận tin / trễ khi tab ẩn | `host_status.pageDriftMs` cao → bị throttle; thử `hideStrategy: "offscreen"`; kiểm tra cờ Chromium & EcoQoS ([HOST_RUNTIME.md §3](HOST_RUNTIME.md#3-chống-throttling--nhiều-lớp)) |
| Host mất kết nối sau khi máy ngủ | Kiểm tra `keepAwake`, power plan của Windows; log sự kiện resume |
| `zalo://adapter_error` | Zalo đổi giao diện → cập nhật selector |
| Tin từ client kẹt ở `queued` | Host có online (`GET /zalo-host`)? Host có giữ lease không (có máy khác đang làm host)? Rate limit `HOST_SEND_RATE_PER_MIN`? |
| Host báo "lease taken" | Workspace đã có host khác online → tắt host kia hoặc admin dùng takeover |

Không dán token, cookie, nội dung tin nhắn vào issue/log khi báo lỗi; dùng output của `diag_snapshot`.
