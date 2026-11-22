# apps/desktop — Tauri 2 + Rust

Vỏ desktop của ZaloCare. Một bộ cài, hai chế độ (chọn lúc thiết lập):

- **Host** — app giữ **đúng 1 tài khoản Zalo** cho cả workspace, **chạy nền 24/7** (tray, autostart, chống throttling, watchdog — xem [HOST_RUNTIME.md](../../docs/HOST_RUNTIME.md)). HostAgent Rust đồng bộ tin lên backend và thực hiện lệnh mà các client gửi qua backend.
- **Client** — chỉ cửa sổ chính, không tạo tab Zalo.

Thành phần:

1. **Cửa sổ chính** (`main`) — tải `APP_URL` (`https://app.<domain>`, dev: Vite `:5173`).
2. **Tab Zalo** (`zalo`, chỉ ở chế độ host) — WebView `https://chat.zalo.me`, profile cố định, **chạy ẩn** sau khi đăng nhập.
3. **`client_api`** — cầu nối Zalo ⇄ Frontend host. Đặc tả: [docs/CLIENT_API.md](../../docs/CLIENT_API.md). Mô hình host–client: [ADR 0004](../../docs/decisions/0004-host-client-model.md).

## Cấu trúc

```text
apps/desktop/
├─ src-tauri/
│  ├─ Cargo.toml, tauri.conf.json, build.rs
│  ├─ capabilities/
│  │  ├─ main.json          cửa sổ main, remote origin app.<domain>, allowlist command client_api
│  │  └─ zalo.json          cửa sổ zalo-*, remote origin chat.zalo.me, chỉ bridge_ingest
│  ├─ icons/
│  ├─ src/
│  │  ├─ main.rs, lib.rs     entry, đăng ký plugin/command
│  │  ├─ app/               setup, single-instance, updater, tạo cửa sổ main, chế độ host/client; tray/
│  │  ├─ client_api/
│  │  │  ├─ commands/       #[tauri::command] cho frontend: app_info, zalo_*, diag_snapshot
│  │  │  ├─ events/         emit zalo://status, zalo://message, …
│  │  │  └─ (types.rs, error.rs)  envelope, BridgeError — khớp packages/contracts/fixtures
│  │  ├─ zalo/
│  │  │  ├─ window/         tab zalo duy nhất: tạo/ẩn/hiện/đóng, profile cố định, background throttling
│  │  │  ├─ bridge/         bridge_ingest, validate, rate limit, dispatch action vào tab
│  │  │  ├─ adapter/        chuẩn hóa dữ liệu thô → ZaloMessage/ZaloThread
│  │  │  └─ session/        trạng thái phiên, profile tài khoản, phát hiện đổi tài khoản
│  │  ├─ host_agent/
│  │  │  ├─ credentials/    device token trong Windows Credential Manager
│  │  │  ├─ connection/     Socket.IO /host: lease, heartbeat, reconnect
│  │  │  ├─ sync/           outbox → POST /sync/batch
│  │  │  └─ executor/       host.command → action Zalo → host.command_result
│  │  ├─ background/
│  │  │  ├─ power/          tắt EcoQoS, keep-awake, sleep/resume
│  │  │  ├─ watchdog/       heartbeat tab Zalo, reload/tạo lại khi treo
│  │  │  └─ autostart/      khởi động cùng Windows (--background)
│  │  ├─ storage/           SQLite: settings (mode, deviceId), outbox, commandId đã thực hiện
│  │  ├─ state/             AppState
│  │  └─ utils/
│  └─ tests/                test contract với fixtures, test outbox
└─ zalo-inject/              TypeScript → dist/zalo-inject.js (Rust include_str!)
   └─ src/
      ├─ index.ts           khởi tạo window.__zc = { dispatch }
      ├─ observers/         auth, threads, messages
      ├─ actions/           sendMessage, openThread, loadHistory
      ├─ selectors/         ★ toàn bộ selector Zalo Web + SELECTOR_VERSION
      └─ transport/         đóng envelope, gọi bridge_ingest
```

## Quy tắc

- Tab Zalo là **vùng không tin cậy**: chỉ có `bridge_ingest`, Rust validate mọi message.
- Không đọc/gửi cookie, localStorage, HTML của tab Zalo ra ngoài; không log nội dung tin nhắn.
- Gửi action vào tab chỉ bằng `window.__zc.dispatch(<json đã serialize>)`, không ghép chuỗi JS.
- Thêm command mới → cập nhật contract + capability + CLIENT_API.md cùng PR.
- Mỗi command trả `Result<T, BridgeError>`; không `unwrap()` trong đường chạy chính.

## Lệnh (sau M1)

```bash
pnpm --filter desktop tauri dev
pnpm --filter desktop tauri build
cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml
pnpm --filter zalo-inject build
```
