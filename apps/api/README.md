# apps/api — NestJS + PostgreSQL

Nguồn dữ liệu chuẩn của ZaloCare: xác thực, workspace & phân quyền, khách hàng, hội thoại, tin nhắn đã đồng bộ, realtime, audit. Chạy ở `https://api.<domain>`.

## Cấu trúc

```text
apps/api/
├─ prisma/
│  ├─ schema.prisma        mô hình dữ liệu (xem docs/DATA_MODEL.md)
│  ├─ migrations/          migration có phiên bản — nguồn chuẩn của schema
│  └─ seed/                dữ liệu mẫu cho dev
├─ src/
│  ├─ main.ts, app.module.ts
│  ├─ config/              validate env (zod), fail-fast khi thiếu biến
│  ├─ database/            PrismaService, transaction helper
│  ├─ common/
│  │  ├─ decorators/       @CurrentUser, @Workspace, @Roles
│  │  ├─ guards/           JwtAuthGuard, WorkspaceGuard, RolesGuard
│  │  ├─ filters/          định dạng lỗi chuẩn
│  │  ├─ interceptors/     logging (che dữ liệu), requestId
│  │  ├─ pipes/            zod validation pipe
│  │  └─ dto/              pagination, cursor
│  └─ modules/
│     ├─ health/ auth/ users/ workspaces/
│     ├─ zalo-host/        tài khoản Zalo của workspace, host lease/presence, hàng đợi host_commands
│     ├─ sync/ conversations/ messages/
│     ├─ customers/ tags/ assignments/ notes/ reminders/ quick-replies/
│     ├─ activities/ audit/
│     └─ realtime/         Socket.IO gateway
├─ test/
│  ├─ unit/
│  └─ e2e/                 supertest + DB test riêng
└─ .env.example
```

Mỗi module: `*.module.ts`, `*.controller.ts`, `*.service.ts`, `dto/`, `*.spec.ts`. Controller mỏng, logic ở service, truy cập DB qua Prisma trong service (tách repository khi phức tạp).

## Quy ước

- Prefix `/api/v1`; OpenAPI `/api/docs`. Danh sách endpoint: [docs/API.md](../../docs/API.md).
- Mọi truy vấn dữ liệu nghiệp vụ lọc theo `workspaceId` lấy từ `WorkspaceGuard`, không tin `workspaceId` trong body.
- `sync/batch` phải idempotent (upsert theo `zaloMsgId`/`zaloThreadId`) và chỉ nhận từ host đang giữ lease.
- Client không gọi Zalo: thao tác cần Zalo → tạo `host_commands` → `ZaloHostService` dispatch qua phòng `host:<workspaceId>`.
- Sau khi ghi thay đổi người khác cần thấy → phát event qua `RealtimeService`.
- Thao tác nhạy cảm → ghi `audit`.

## Lệnh (sau M1)

```bash
pnpm --filter api dev | build | test | test:e2e
pnpm --filter api db:migrate | db:seed | db:studio
```
