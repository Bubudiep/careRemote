# Backend API

Base URL: `https://api.<domain>/api/v1` (local: `http://localhost:3000/api/v1`). OpenAPI tại `/api/docs` (tắt ở production hoặc bảo vệ bằng basic auth).

## Quy ước

- JSON, `camelCase`, thời gian ISO-8601 UTC.
- Xác thực: `Authorization: Bearer <accessToken>` (JWT 15 phút). Refresh token dài hạn ở cookie `HttpOnly; Secure; SameSite=Lax` domain `.<domain>`.
- Workspace hiện hành: header `X-Workspace-Id`; guard kiểm tra membership + role.
- Phân trang cursor: `?cursor=…&limit=50` → `{ items, nextCursor }`.
- Lỗi thống nhất:
  ```json
  { "error": { "code": "CUSTOMER_NOT_FOUND", "message": "…", "details": {} }, "requestId": "…" }
  ```
- Idempotency: các endpoint tạo dữ liệu từ client (sync, gửi tin) nhận `Idempotency-Key` hoặc dựa trên khóa tự nhiên (`zaloMsgId`, `clientMsgId`).
- CORS: chỉ `https://app.<domain>` (+ origin local khi dev).

## Endpoint (M2–M5)

| Nhóm | Endpoint |
|---|---|
| Health | `GET /health` (liveness), `GET /health/ready` (DB) |
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me` |
| Workspaces | `GET /workspaces`, `POST /workspaces`, `GET/PATCH /workspaces/:id`, `GET/POST/PATCH/DELETE /workspaces/:id/members` , `POST /workspaces/:id/invites` |
| Zalo host | `GET /zalo-host` (tài khoản Zalo + trạng thái host), `POST /zalo-host/devices` `{ deviceId, name }` → `{ deviceToken }` (admin, trả token một lần), `GET /zalo-host/devices`, `DELETE /zalo-host/devices/:id` (thu hồi → host nhận `host.revoked`), `POST /zalo-host/takeover` `{ deviceId }`, `DELETE /zalo-host/account` (gỡ tài khoản Zalo) |
| Sync *(device token)* | `POST /sync/batch` `{ upToSeq, threads[], messages[], updates[] }` → `{ accepted, lastSeq }` — header `Authorization: Device <token>`, chỉ nhận từ device đang giữ lease |
| Conversations | `GET /conversations?status=&assignee=&tag=&q=`, `GET /conversations/:id`, `PATCH /conversations/:id` (status, customerId), `POST /conversations/:id/read` |
| Messages | `GET /conversations/:id/messages?before=`, `POST /conversations/:id/messages` `{ text, clientMsgId }` → 202 (tạo message `queued` + host command), `POST /messages/:id/retry`, `POST /conversations/:id/load-history` |
| Customers | `GET /customers?q=&tag=&stage=&owner=`, `POST /customers`, `GET/PATCH/DELETE /customers/:id`, `POST /customers/:id/merge`, `GET /customers/export` |
| Tags | `GET/POST /tags`, `PATCH/DELETE /tags/:id`, `PUT /customers/:id/tags` |
| Assignments | `POST /conversations/:id/assign` `{ userId }`, `POST /conversations/:id/unassign` |
| Notes | `GET/POST /customers/:id/notes`, `PATCH/DELETE /notes/:id` |
| Reminders | `GET /reminders?mine=1&due=`, `POST /reminders`, `PATCH /reminders/:id` |
| Quick replies | `GET/POST /quick-replies`, `PATCH/DELETE /quick-replies/:id` |
| Activities | `GET /customers/:id/activities` |
| Reports | `GET /reports/overview?from=&to=` (số hội thoại, thời gian phản hồi, theo nhân viên) |
| Audit | `GET /audit-logs` (admin) |

## Realtime (Socket.IO)

Hai namespace tách biệt:

| Namespace | Ai kết nối | Xác thực | Phòng |
|---|---|---|---|
| `/realtime` | Mọi người dùng (web, desktop) | `auth: { token: <JWT> }` | `ws:<workspaceId>`, `conv:<id>` |
| `/host` | HostAgent (Rust) | `auth: { deviceToken }` | `host:<workspaceId>` |

### Namespace `/realtime` — event cho mọi client

| Event server → client | Payload |
|---|---|
| `message.created` | `{ conversationId, message }` |
| `message.updated` | `{ messageId, status }` — `queued → dispatched → sent \| failed \| expired` |
| `conversation.updated` | `{ conversation }` |
| `assignment.changed` | `{ conversationId, userId }` |
| `zalo_host.status` | `{ online, zaloState, hostUserId, deviceId, lastSeenAt }` |
| `reminder.due` | `{ reminder }` |

### Namespace `/host` (HostAgent)

| Event | Chiều | Payload |
|---|---|---|
| `host.lease` | server → host | `{ granted: true }` hoặc `{ granted: false, takenBy: { deviceId, name } }` |
| `host.hello` | host → server | `{ zaloUid, name, appVersion, selectorVersion }` — backend kiểm tra khớp tài khoản đã gắn |
| `host.revoked` | server → host | `{ reason: "takeover" \| "device_revoked" \| "account_removed" }` — host dừng tab Zalo |
| `host.heartbeat` | host → server (15s) | `{ zaloState, outboxSize, pendingCommands, driftMs, recoveries24h, selectorVersion }` |
| `host.command` | server → host | `{ commandId, type: "send_message" \| "load_history" \| "open_thread", payload, expiresAt }` |
| `host.command_result` | host → server (ack) | `{ commandId, ok, zaloMsgId?, error? }` |

Backend coi host offline khi mất 3 heartbeat liên tiếp. Lệnh chỉ dispatch khi host online và qua rate limit; lệnh quá `expiresAt` chuyển `expired`.

Schema của tất cả event nằm trong `packages/contracts/src/realtime`.
