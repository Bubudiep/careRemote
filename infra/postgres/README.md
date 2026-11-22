# PostgreSQL local

ZaloCare dùng PostgreSQL 16+ cài trực tiếp trên máy. Thư mục này chỉ chứa hướng dẫn; **schema và migration nằm ở `apps/api/prisma`**.

```sql
CREATE ROLE zalocare WITH LOGIN PASSWORD 'dev-password';
CREATE DATABASE zalocare OWNER zalocare;
-- DB cho test e2e
CREATE DATABASE zalocare_test OWNER zalocare;
-- Extension dùng cho tìm kiếm
\c zalocare
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
```

Đặt `DATABASE_URL` trong `apps/api/.env` (mẫu: `apps/api/.env.example`).

Reset DB dev: `pnpm --filter api prisma migrate reset` (xóa toàn bộ dữ liệu). Không dùng dữ liệu khách hàng thật hoặc thông tin xác thực production ở local.
