# Quy trình làm việc

## 1. Vòng đời một task

```text
Backlog (TASKS.md) ─▶ Đang làm [~] ─▶ PR mở ─▶ Review ─▶ Merge vào develop ─▶ Staging ─▶ Release (main)
```

1. Chọn task trong [TASKS.md](TASKS.md) có phụ thuộc đã xong, đánh dấu `[~] @tên`.
2. Nếu task chạm nhiều thành phần (vd. thêm command bridge), cập nhật contract + tài liệu **trước**, rồi mới code từng phía.
3. Tạo nhánh, code, tự test theo Definition of Done.
4. Mở PR theo template, gắn mã task trong tiêu đề.
5. Merge → đánh dấu `[x]` + link PR.

## 2. Nhánh

| Nhánh | Mục đích |
|---|---|
| `main` | Luôn = production. Chỉ merge từ `release/*` hoặc `hotfix/*` |
| `develop` | Nhánh tích hợp, tự deploy staging |
| `feat/<mã-task>-<mô-tả>` | Tính năng, vd. `feat/M4-5-zalo-auth-observer` |
| `fix/<mã-task>-<mô-tả>` | Sửa lỗi |
| `docs/…`, `chore/…`, `refactor/…` | Tài liệu, cấu hình, tái cấu trúc |
| `release/vX.Y.Z`, `hotfix/<mô-tả>` | Chuẩn bị phát hành / sửa gấp production |

## 3. Commit — Conventional Commits

```text
<type>(<scope>): <mô tả ngắn, mệnh lệnh>

type : feat | fix | docs | refactor | test | chore | perf | ci
scope: api | web | desktop | inject | contracts | infra | docs
```

Ví dụ: `feat(desktop): add host_agent executor`, `fix(inject): update thread list selector v3`.

## 4. Pull request

- Nhỏ, một mục đích; > 400 dòng thay đổi (không tính file sinh tự động) thì tách.
- Mô tả theo `.github/pull_request_template.md`: mục đích, mã task, cách test, ảnh chụp UI, ghi chú migration/env, tác động bảo mật.
- CI phải xanh. Ít nhất 1 approve; PR chạm `client_api`, capability, auth, quyền hoặc migration cần reviewer phụ trách thành phần đó.

### Checklist review

- [ ] Quyền kiểm tra phía server, có lọc `workspace_id`
- [ ] Contract validate tại ranh giới (zod / serde) và đồng bộ 3 phía
- [ ] Không log token, cookie, nội dung tin nhắn, SĐT
- [ ] Migration có hướng rollback
- [ ] UI có loading / empty / error / offline
- [ ] Capability Tauri không bị nới rộng ngoài ý định
- [ ] Selector Zalo mới nằm trong `zalo-inject/selectors` và tăng version

## 5. Phạm vi phụ trách

| Thư mục | Phụ trách |
|---|---|
| `apps/api`, `infra/postgres` | Backend |
| `apps/web` | Frontend |
| `apps/desktop/src-tauri` | Desktop / Rust |
| `apps/desktop/zalo-inject` | Desktop / Zalo adapter |
| `packages/contracts` | Cả ba — mọi thay đổi cần review chéo |
| `infra/deploy`, `.github` | DevOps |
| `docs` | Tất cả |

## 6. Phiên bản & phát hành

- **API & Web**: SemVer theo tag `api-vX.Y.Z`, `web-vX.Y.Z`; deploy liên tục từ `develop` lên staging, từ `main` lên production.
- **Desktop**: tag `desktop-vX.Y.Z` → CI build + ký → updater. Tăng `protocolV` khi đổi contract bridge không tương thích.
- **Hotfix adapter Zalo**: vì zalo-inject đóng gói trong desktop, lỗi selector cần phát hành desktop patch → giữ quy trình release desktop nhanh (< 1 giờ).
- Ghi `CHANGELOG.md` cho mỗi app khi release.

### Checklist release

1. Staging chạy ổn ≥ 1 ngày, smoke test: đăng nhập, kết nối Zalo, nhận/gửi tin, phân công.
2. Backup DB → `prisma migrate deploy` → deploy API → kiểm tra `/health/ready`.
3. Deploy Web → kiểm tra trên trình duyệt và desktop phiên bản hiện hành.
4. Phát hành desktop (nếu có) → kiểm tra auto-update từ bản trước.
5. Ghi chú phát hành, theo dõi lỗi 24 giờ.

## 7. Quyết định kỹ thuật

Quyết định có ảnh hưởng dài hạn → viết ADR trong [decisions/](decisions/), trạng thái `Đề xuất` → review trong PR → `Chấp thuận`. Muốn đổi quyết định cũ: viết ADR mới và đánh dấu ADR cũ `Bị thay thế`.
