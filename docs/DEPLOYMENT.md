# Triển khai

## Tên miền

| Host | Phục vụ | Ghi chú |
|---|---|---|
| `app.<domain>` | Bundle tĩnh Vite (`apps/web/dist`) | SPA fallback về `index.html`; cache dài cho `/assets/*`, `no-cache` cho `index.html` |
| `api.<domain>` | NestJS (port nội bộ 3000) | Reverse proxy, bật WebSocket upgrade cho `/realtime` |
| `releases.<domain>` *(tùy chọn)* | Bộ cài + `latest.json` cho Tauri updater | Có thể dùng GitHub Releases thay thế |

Staging dùng `app.staging.<domain>` / `api.staging.<domain>`. Mẫu cấu hình nginx đặt tại `infra/deploy/nginx/`.

## Biến môi trường

`apps/api/.env`:

| Biến | Ví dụ | Mô tả |
|---|---|---|
| `NODE_ENV` | `production` | |
| `PORT` | `3000` | |
| `DATABASE_URL` | `postgresql://zalocare:***@127.0.0.1:5432/zalocare` | |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | chuỗi ngẫu nhiên ≥ 32 byte | |
| `CORS_ORIGINS` | `https://app.<domain>` | Phân tách bằng dấu phẩy |
| `COOKIE_DOMAIN` | `.<domain>` | Cho refresh cookie |
| `LOG_LEVEL` | `info` | |
| `HOST_HEARTBEAT_SEC` | `15` | Chu kỳ heartbeat host; mất 3 lần → offline |
| `HOST_COMMAND_TTL` | `600` | Giây; lệnh quá hạn → `expired` |
| `HOST_SEND_RATE_PER_MIN` | `20` | Giới hạn tin gửi qua host mỗi phút |

`apps/web/.env` (biến build-time, **không chứa bí mật**):

| Biến | Ví dụ |
|---|---|
| `VITE_API_URL` | `https://api.<domain>/api/v1` |
| `VITE_WS_URL` | `wss://api.<domain>/realtime` |

Desktop (`tauri.conf.json` / biến build):

| Biến | Ví dụ | Mô tả |
|---|---|---|
| `APP_URL` | `https://app.<domain>` | URL cửa sổ chính tải |
| `ALLOWED_ORIGINS` | `https://app.<domain>` | Đưa vào `capabilities/main.json` (remote urls) |

## Quy trình deploy

1. **CI** chạy lint, typecheck, test, build cho mọi PR (`.github/workflows/ci.yml`).
2. **API**: build → chạy `prisma migrate deploy` → khởi động lại (pm2/systemd/container) → kiểm tra `/health/ready`.
3. **Web**: build với env của môi trường → upload `dist/` → purge cache `index.html`.
4. **Desktop**: tag `desktop-vX.Y.Z` → CI build Windows (MSI/NSIS), macOS (dmg, ký + notarize) → ký updater → publish `latest.json`.

Thứ tự khi có thay đổi phá vỡ contract: **API (tương thích ngược) → Web → Desktop**. Web phải chạy được với desktop cũ ít nhất 1 phiên bản protocol (kiểm tra `app_info.protocolV`).

## Sao lưu

- `pg_dump` hằng ngày, giữ 14 bản, lưu ngoài máy chủ; thử khôi phục hằng tháng (ghi vào `docs/runbooks/`).
- Migration phải có kế hoạch rollback (migration ngược hoặc restore) trước khi chạy production.
