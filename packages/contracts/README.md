# packages/contracts

Schema dùng chung (zod) giữa `web`, `api` và (gián tiếp) Rust `client_api` + `zalo-inject`.

```text
src/
├─ bridge/      envelope, command args/result, event payload, BridgeError, PROTOCOL_V
├─ http/        DTO request/response REST
├─ realtime/    event Socket.IO
├─ schemas/     kiểu cơ bản: Id, Cursor, Page<T>, ISODate, Phone…
└─ index.ts
fixtures/
├─ bridge/      *.json mẫu — TS và Rust cùng test parse/serialize
└─ http/
```

## Quy tắc

- Export cả schema (`XSchema`) và type (`type X = z.infer<typeof XSchema>`).
- Validate tại ranh giới lúc chạy; type TS không thay thế validate.
- Rust không sinh từ TS — struct viết tay trong `client_api`, test bằng `fixtures/bridge`.
- Thay đổi không tương thích → tăng `PROTOCOL_V` (bridge) hoặc version API.
- Không đưa cookie, token, cấu trúc DOM Zalo vào contract.
