# 0001. Stack & công cụ monorepo

- Trạng thái: Đề xuất
- Ngày: 2026-11-22

## Bối cảnh

Ba app (NestJS, Vite, Tauri) chia sẻ contract và cấu hình; team nhỏ, cần ít công cụ nhưng build nhanh.

## Quyết định

| Hạng mục | Lựa chọn |
|---|---|
| Monorepo | pnpm workspaces + Turborepo (cache task `build/lint/test`) |
| Backend | NestJS, Prisma ORM, PostgreSQL 16+, Socket.IO, `@nestjs/jwt` + passport |
| Validate | zod (contracts dùng chung); `nestjs-zod` hoặc class-validator ở DTO API |
| Frontend | Vite + React + TypeScript, TanStack Router + TanStack Query, Zustand, Tailwind CSS + shadcn/ui |
| Desktop | Tauri 2, Rust stable, serde, tokio; zalo-inject build bằng esbuild |
| Test | Vitest (web, contracts), Jest/Vitest + supertest (api), `cargo test` |
| Lint/format | ESLint + Prettier; `cargo fmt` + `clippy -D warnings` |

## Phương án đã cân nhắc

- **TypeORM / Drizzle** thay Prisma: Prisma có migration + Studio tiện cho team nhỏ; Drizzle nhẹ hơn nhưng ít công cụ.
- **Nx** thay Turborepo: mạnh hơn nhưng nặng cấu hình.
- **Vue/Svelte**: React có hệ sinh thái UI/CRM component lớn nhất.

## Hệ quả

Contract viết một lần bằng zod, dùng cho cả web và api; Rust phải tự định nghĩa struct và kiểm tra bằng fixture chung.

## Khi nào xem xét lại

Khi Prisma gây vấn đề hiệu năng với bảng `messages` lớn (có thể dùng raw SQL/partition cho riêng bảng đó).
