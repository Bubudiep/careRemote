# Bảo mật & quyền riêng tư

## Tài sản cần bảo vệ

| Tài sản | Nằm ở đâu | Biện pháp |
|---|---|---|
| Phiên Zalo (cookie, storage) | Profile WebView trên máy nhân viên | Không đọc/không gửi đi; `zalo_logout { wipeProfile }` để xóa; profile tách riêng từng tài khoản |
| Access token ZaloCare | Bộ nhớ frontend (không localStorage) | JWT ngắn hạn; refresh bằng cookie HttpOnly |
| Device token của host | Windows Credential Manager trên máy host; DB chỉ lưu hash | Phạm vi hẹp: chỉ `/host` + `/sync/batch`; thu hồi được; không trả lại UI |
| Refresh token | Cookie HttpOnly + hash trong DB | Xoay vòng, thu hồi khi logout/đổi mật khẩu |
| Tin nhắn, thông tin khách hàng | PostgreSQL | Cô lập theo workspace, TLS, sao lưu mã hóa, thời hạn lưu |
| Khóa ký desktop/updater | Secret của CI | Không lưu trong repo, chỉ CI release dùng |

## Ranh giới tin cậy

1. **Tab Zalo là vùng không tin cậy** — chạy trang bên thứ ba. Capability của nó chỉ có `bridge_ingest`; Rust validate mọi message bằng schema, giới hạn kích thước (ví dụ 256 KB/message) và tần suất.
2. **Cửa sổ chính** chỉ nhận IPC từ origin `app.<domain>` đã khai báo. Đặt CSP chặt cho web app; không tải script từ CDN không kiểm soát.
3. **API** coi mọi dữ liệu từ client (kể cả sync batch) là không tin cậy: validate DTO; `sync/batch`, `host.command_result` chỉ chấp nhận từ device token đang giữ **host lease** của workspace.
4. **Kênh lệnh client → host**: client không gửi lệnh trực tiếp tới host; backend tạo `host_commands` sau khi kiểm tra quyền (role, phân công hội thoại), rate limit, rồi mới dispatch. Host chỉ thực hiện các loại lệnh trong allowlist (`send_message`, `load_history`, `open_thread`).

## Quy tắc log

- Không log: mật khẩu, token, cookie, nội dung tin nhắn, số điện thoại đầy đủ.
- Log có `requestId`, `workspaceId`, `userId`, mã lỗi. Che dữ liệu bằng interceptor/serializer tập trung.
- Diagnostics từ desktop (`diag_snapshot`) chỉ gồm trạng thái, phiên bản, mã lỗi.

## Phân quyền

| Vai trò | Quyền |
|---|---|
| `owner` | Toàn quyền, thanh toán, xóa workspace |
| `admin` | Quản lý thành viên, gắn/gỡ tài khoản Zalo, làm host, takeover host, tag, xuất dữ liệu, xem audit |
| `agent` | Xem/trả lời hội thoại được giao hoặc chưa giao, quản lý khách hàng, ghi chú |
| `viewer` | Chỉ xem, báo cáo |

Kiểm tra phía server cho từng đối tượng (không chỉ theo route). Có test truy cập chéo workspace cho mọi module.

## Rủi ro tài khoản Zalo

ZaloCare vận hành trên Zalo Web bằng chính tài khoản của người dùng; đây không phải API chính thức (Zalo OA/ZNS). Rủi ro và biện pháp:

- **Zalo đổi giao diện** → adapter hỏng. Gom selector vào `zalo-inject/selectors`, có version, phát `zalo://adapter_error`, có checklist kiểm thử thủ công mỗi bản phát hành.
- **Tài khoản bị hạn chế/khóa** do hành vi bất thường → giới hạn tốc độ gửi (cấu hình theo workspace, mặc định thấp), không có tính năng gửi hàng loạt/spam, mọi tin gửi đi đều do nhân viên chủ động.
- **Điều khoản sử dụng** → người dùng được thông báo rõ khi kết nối tài khoản; xem xét bổ sung kênh Zalo OA chính thức trong lộ trình (xem [PROJECTS.md](PROJECTS.md)).

## Checklist trước mỗi bản phát hành

- [ ] Capability Tauri không mở rộng ngoài danh sách trong [CLIENT_API.md](CLIENT_API.md)
- [ ] CSP/CORS không dùng wildcard ở production
- [ ] Dependency audit (`pnpm audit`, `cargo audit`) không còn lỗi mức cao
- [ ] Test cô lập workspace đạt
- [ ] Bộ cài và updater đã ký
