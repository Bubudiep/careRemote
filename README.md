# ZaloCare

ZaloCare là ứng dụng **quản lý chăm sóc khách hàng (CSKH) trên Zalo** cho đội ngũ bán hàng/hỗ trợ: nhiều nhân viên cùng chăm khách trên **một tài khoản Zalo duy nhất**, với hộp thư chung, hồ sơ khách hàng, gắn nhãn, phân công, ghi chú, nhắc việc, báo cáo.

**Mô hình Host – Client:**

- **Host** — một app desktop đăng nhập tài khoản Zalo (mỗi app chỉ 1 tài khoản), giữ Zalo Web chạy ẩn, đồng bộ tin nhắn lên backend và thực hiện lệnh gửi tin.
- **Client** — các nhân viên khác trên web hoặc desktop, kết nối tới host **thông qua backend (REST + Socket.IO)** để đọc và trả lời khách.

## Ba thành phần

| Thành phần | Công nghệ | Chạy ở đâu | Vai trò |
|---|---|---|---|
| `apps/api` | NestJS + PostgreSQL + Socket.IO | `https://api.<domain>` | Nguồn dữ liệu chuẩn, phân quyền, realtime, **trung chuyển lệnh client → host** |
| `apps/web` | Vite + React + TypeScript | `https://app.<domain>` | Giao diện CSKH cho mọi nhân viên (host và client dùng chung) |
| `apps/desktop` | Tauri 2 + Rust | Máy host (và client nếu muốn) | **Chạy nền 24/7** (tray, autostart, chống throttling): tab Zalo Web ẩn + **HostAgent** Rust đồng bộ & nhận lệnh; `client_api` cho UI |

```text
 ┌──────── HOST (desktop chạy nền, 1 tài khoản Zalo) ────────┐
 │ UI app.<domain> ◀client_api▶ HostAgent (Rust) ◀▶ Zalo ẩn  │
 └───────────────────────────────┬───────────────────────────┘
                 │ sync + host.command (REST / Socket.IO)
                 ▼
        api.<domain> (NestJS) ──▶ PostgreSQL
           ▲        ▲        ▲
           │        │        │  REST + realtime
       Client 1  Client 2  Client N   (web / desktop chế độ client)
```

Chi tiết: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) và đặc tả cầu nối [docs/CLIENT_API.md](docs/CLIENT_API.md).

## Cấu trúc repository

```text
zaloCare/
├─ apps/
│  ├─ api/                 NestJS: src/modules/* theo miền nghiệp vụ, prisma/ (schema + migration)
│  ├─ web/                 Vite: src/features/* theo tính năng, lib/bridge (adapter client_api)
│  └─ desktop/
│     ├─ src-tauri/        Rust: app/, client_api/, zalo/*, host_agent/*, background/{power,watchdog,autostart}, storage/
│     └─ zalo-inject/      TypeScript được inject vào Zalo Web (observer + action), build thành 1 bundle
├─ packages/
│  ├─ contracts/           Schema dùng chung (zod): http, bridge, realtime + fixtures JSON cho test Rust/TS
│  └─ config/              tsconfig, eslint dùng chung
├─ infra/
│  ├─ postgres/            Hướng dẫn DB local
│  ├─ deploy/nginx/        Mẫu reverse proxy cho api.<domain>, app.<domain>
│  └─ observability/       Log/metrics/tracing (sau)
├─ scripts/                Script tiện ích dev/release
├─ docs/                   Tài liệu dự án (xem bảng dưới)
└─ .github/                CI workflow, PR template
```

## Tài liệu

| File | Nội dung |
|---|---|
| [docs/PROJECTS.md](docs/PROJECTS.md) | Mục tiêu, phạm vi, các giai đoạn (milestone) M0–M6 |
| [docs/TASKS.md](docs/TASKS.md) | Backlog chi tiết theo mã task, phụ thuộc, tiêu chí nghiệm thu |
| [docs/WORKFLOW.md](docs/WORKFLOW.md) | Quy trình làm việc: nhánh, commit, PR, review, release |
| [docs/GUIDE.md](docs/GUIDE.md) | Cài đặt môi trường, chạy local, lệnh thường dùng, xử lý sự cố |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Kiến trúc, trách nhiệm thành phần, luồng dữ liệu chính |
| [docs/CLIENT_API.md](docs/CLIENT_API.md) | Đặc tả cầu nối Rust `client_api`: command, event, envelope, lỗi |
| [docs/HOST_RUNTIME.md](docs/HOST_RUNTIME.md) | Host chạy nền: tray, autostart, chống throttling, watchdog, benchmark |
| [docs/DATA_MODEL.md](docs/DATA_MODEL.md) | Mô hình dữ liệu PostgreSQL |
| [docs/API.md](docs/API.md) | Quy ước REST/WebSocket và danh sách endpoint |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Tên miền, môi trường, triển khai, phát hành desktop |
| [docs/SECURITY.md](docs/SECURITY.md) | Mô hình bảo mật, dữ liệu nhạy cảm, rủi ro tài khoản Zalo |
| [docs/decisions/](docs/decisions/) | ADR — các quyết định kiến trúc |
| [docs/runbooks/](docs/runbooks/) | Hướng dẫn vận hành/xử lý sự cố |

Mỗi app/package có README riêng mô tả phạm vi và quy ước của nó.

## Bắt đầu nhanh

> Trạng thái: **bộ khung tài liệu + thư mục**. Manifest và code sẽ được tạo trong M1 (xem [TASKS.md](docs/TASKS.md)).

```bash
pnpm install
cp apps/api/.env.example apps/api/.env      # sửa DATABASE_URL, JWT_SECRET
cp apps/web/.env.example apps/web/.env
pnpm --filter api db:migrate
pnpm dev                                    # api + web
pnpm --filter desktop tauri dev             # desktop, trỏ tới Vite local
```

Hướng dẫn đầy đủ: [docs/GUIDE.md](docs/GUIDE.md).
