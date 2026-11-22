# Đặc tả cầu nối desktop

Có ba bề mặt giao tiếp trong app desktop:

```text
             (1) client_api                    (2) bridge
UI (main) ◀── invoke / event ──▶ Rust ◀── bridge_ingest / dispatch ──▶ zalo-inject (tab zalo)
                                  │
                                  └── (3) HostAgent ◀── Socket.IO /host + REST ──▶ api.<domain>
```

1. **`client_api`** — UI gọi để thiết lập và theo dõi host. UI **không** gửi tin Zalo qua đây; gửi tin luôn đi qua API như mọi client.
2. **bridge** — giữa Rust và zalo-inject trong tab Zalo.
3. **HostAgent ⇄ backend** — đặc tả ở [API.md](API.md#namespace-host-hostagent).

Mỗi app giữ **đúng một tài khoản Zalo** trong tab `zalo`, nên không có tham số `accountId`. Schema chuẩn ở `packages/contracts/src/bridge`; struct Rust test bằng `packages/contracts/fixtures/bridge/*.json`.

## 1. `client_api` — Commands (UI → Rust)

Tất cả trả `Result<T, BridgeError>`. Ở chế độ client, mọi command `host_*`/`zalo_*` trả `NOT_HOST`.

| Command | Args | Trả về | Mô tả |
|---|---|---|---|
| `app_info` | — | `{ version, platform, protocolV, mode, deviceId }` | Kiểm tra tương thích, chế độ |
| `app_set_mode` | `{ mode: "host" \| "client" }` | `()` | Chọn chế độ (khởi động lại để áp dụng) |
| `host_configure` | `{ apiUrl, deviceToken }` | `HostStatus` | Lưu device token (Credential Manager), khởi động HostAgent |
| `host_unlink` | — | `()` | Xóa token, dừng HostAgent (thường kèm `zalo_logout`) |
| `host_status` | — | `HostStatus` | Trạng thái HostAgent + tab Zalo + outbox |
| `host_pause` / `host_resume` | — | `()` | Tạm dừng nhận lệnh (vẫn giữ phiên Zalo) |
| `zalo_show` / `zalo_hide` | — | `()` | Hiện tab Zalo (quét QR, xem trực tiếp) / ẩn |
| `zalo_logout` | `{ wipeProfile: bool }` | `()` | Đăng xuất Zalo; `wipeProfile` xóa profile WebView |
| `background_get` / `background_set` | `BackgroundSettings` | `BackgroundSettings` | Cài đặt chạy nền |
| `diag_snapshot` | — | `Diagnostics` | Chẩn đoán (đã che dữ liệu nhạy cảm) |

```ts
type BackgroundSettings = {
  autostart: boolean;            // khởi động cùng Windows (mặc định: true ở chế độ host)
  closeToTray: boolean;          // bấm X = ẩn xuống tray (mặc định: true)
  keepAwake: boolean;            // chặn máy sleep khi đang là host (mặc định: true)
  hideStrategy: "hide" | "offscreen";   // cách ẩn tab Zalo, xem HOST_RUNTIME.md §3
  dailyReloadAt?: string;        // "04:00" — reload tab Zalo chủ động mỗi ngày
};
```

## 2. `client_api` — Events (Rust → UI)

| Event | Payload | Khi nào |
|---|---|---|
| `zalo://status` | `ZaloStatus` | Đổi trạng thái phiên Zalo |
| `host://status` | `HostStatus` | Đổi trạng thái HostAgent (kết nối, lease, outbox, lệnh đang chạy) |
| `host://recovered` | `{ action: "reload" \| "recreate", reason }` | Watchdog vừa tự phục hồi tab Zalo |
| `zalo://adapter_error` | `{ selectorVersion, code }` | Không nhận diện được giao diện Zalo |

```ts
type ZaloState  = "starting" | "login_required" | "connected" | "reconnecting" | "disconnected" | "error";
type ZaloStatus = { state: ZaloState; profile?: { zaloUid: string; name: string; avatarUrl?: string }; reason?: string };
type HostStatus = {
  configured: boolean;
  backend: "connecting" | "online" | "offline" | "lease_denied" | "revoked";
  zalo: ZaloStatus;
  paused: boolean;
  outboxSize: number;
  pendingCommands: number;
  lastSyncAt?: string;
  pageDriftMs?: number;          // độ trễ timer trong tab Zalo — dấu hiệu bị throttle
};
```

## 3. bridge — zalo-inject ⇄ Rust

### Envelope

```jsonc
{ "v": 1, "id": "01JD…", "type": "message.received", "ts": "2026-11-22T08:15:00Z", "payload": { } }
```

### zalo-inject → Rust (`bridge_ingest`, chỉ cửa sổ `zalo` được gọi)

| `type` | Payload |
|---|---|
| `inject.heartbeat` | `{ selectorVersion, driftMs, visible }` — mỗi 5s |
| `auth.state` | `{ state: "qr_required" \| "logged_in" \| "logged_out", profile? }` |
| `threads.snapshot` / `threads.changed` | `{ threads: ZaloThread[] }` |
| `message.received` | `{ message: ZaloMessage }` — cả tin vào và tin ra |
| `message.updated` | `{ zaloMsgId, status \| reaction \| recalled }` |
| `action.result` | `{ commandId, ok, zaloMsgId?, error? }` |
| `adapter.error` | `{ selectorVersion, code }` |

### Rust → zalo-inject (`window.__zc.dispatch(json)`)

| `type` | Payload |
|---|---|
| `action.send_message` | `{ commandId, threadId, text, attachments? }` |
| `action.open_thread` | `{ commandId, threadId }` |
| `action.load_history` | `{ commandId, threadId, before? }` |
| `ping` | `{}` — watchdog |

```ts
type ZaloThread = { threadId: string; kind: "user" | "group"; name: string; avatarUrl?: string; lastMessageAt?: string; unread: number };
type ZaloMessage = {
  zaloMsgId: string; threadId: string; direction: "in" | "out";
  senderUid: string; senderName?: string; sentAt: string;
  kind: "text" | "image" | "file" | "sticker" | "link" | "system";
  text?: string; attachments?: { kind: string; url?: string; name?: string; size?: number }[];
  commandId?: string;
};
```

Rust từ chối message sai `v`, sai schema, > 256 KB, hoặc đến từ cửa sổ khác `zalo`. Lỗi validate chỉ log `type` + lý do.

## 4. Lỗi

```ts
type BridgeError = { code: BridgeErrorCode; message: string; retryable: boolean };
// NOT_HOST | NOT_CONFIGURED | NOT_CONNECTED | LEASE_DENIED | THREAD_NOT_FOUND
// | RATE_LIMITED | ADAPTER_UNSUPPORTED | TIMEOUT | INVALID_ARGS | INTERNAL
```

## 5. Bảo mật

- `capabilities/main.json`: cửa sổ `main`, remote origin `https://app.<domain>` (+ `http://localhost:5173` chỉ ở build dev), chỉ command mục 1.
- `capabilities/zalo.json`: cửa sổ `zalo`, remote origin `https://chat.zalo.me`, **chỉ** `bridge_ingest`.
- Device token không bao giờ trả ngược ra UI sau khi `host_configure`.
- Rust gửi action vào tab bằng `window.__zc.dispatch(<json đã serialize>)`, không ghép chuỗi JS.
- Không có command nào trả cookie, localStorage hay HTML của tab Zalo.

## 6. Quy tắc thay đổi

- Thêm field tùy chọn: giữ `v`. Đổi/xóa field hoặc ngữ nghĩa: tăng `v`; web kiểm tra `app_info.protocolV`.
- Mỗi thay đổi: zod schema + struct Rust + fixture + tài liệu này trong cùng PR.
