# apps/web — Vite + React + TypeScript

Giao diện CSKH, deploy tĩnh ở `https://app.<domain>`. Cùng một build chạy ở hai vai trò:

- **Client** (trình duyệt hoặc desktop chế độ client) — đầy đủ tính năng CSKH, kể cả trả lời khách; tin gửi đi được backend chuyển tới host.
- **Host** (desktop chế độ host) — như client, cộng thêm màn thiết lập/trạng thái host. Việc đồng bộ và thực hiện lệnh do **HostAgent Rust** làm ở nền, không phụ thuộc trang web này.

## Cấu trúc

```text
apps/web/
├─ public/
├─ src/
│  ├─ main.tsx
│  ├─ app/
│  │  ├─ providers/        QueryClient, Auth, Theme, Bridge
│  │  └─ layouts/          AppLayout (sidebar + topbar), AuthLayout
│  ├─ routes/              định nghĩa route (TanStack Router), chỉ ghép feature
│  ├─ features/            mỗi feature: components/, api.ts, hooks.ts, types.ts
│  │  ├─ auth/             đăng nhập, đăng ký, chọn workspace
│  │  ├─ dashboard/
│  │  ├─ inbox/            danh sách hội thoại, khung chat, sync engine
│  │  ├─ customers/        danh sách, chi tiết, panel cạnh chat
│  │  ├─ zalo-host/        thiết lập host + QR + cài đặt chạy nền (máy host), badge trạng thái host (mọi client)
│  │  ├─ tags/ assignments/ reminders/ reports/ settings/
│  ├─ components/
│  │  ├─ ui/               primitive (shadcn/ui)
│  │  ├─ layout/           Sidebar, Topbar, PageHeader
│  │  └─ common/           EmptyState, ErrorState, ConnectionBadge…
│  ├─ lib/
│  │  ├─ api/              HTTP client có kiểu, refresh token
│  │  ├─ bridge/           ★ adapter duy nhất gọi Tauri (invoke/listen) + mock cho trình duyệt
│  │  ├─ realtime/         Socket.IO client
│  │  └─ utils/
│  ├─ hooks/ stores/ types/ assets/ styles/
├─ tests/
└─ .env.example
```

## Quy tắc

- Feature **không import `@tauri-apps/api`** — chỉ dùng `lib/bridge` (`bridge.isDesktop`, `bridge.isHost`, `bridge.zalo.sendMessage(...)`, `bridge.on("message", …)`).
- Feature CSKH (inbox, customers…) **không gọi bridge** — luôn đi qua API, để host và client dùng chung một luồng. Chỉ `features/zalo-host` dùng bridge.
- Feature không import chéo nội bộ của feature khác; dùng chung thì đưa lên `components/` hoặc `lib/`.
- Server state → TanStack Query; UI state cục bộ → Zustand/`useState`. Không lưu token vào localStorage.
- Mọi màn hình có loading / empty / error / offline.
- Biến môi trường chỉ `VITE_*`, không chứa bí mật.

## Lệnh (sau M1)

```bash
pnpm --filter web dev | build | preview | test
```
