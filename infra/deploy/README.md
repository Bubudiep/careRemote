# infra/deploy

Cấu hình triển khai cho `app.<domain>` và `api.<domain>`. Xem [docs/DEPLOYMENT.md](../../docs/DEPLOYMENT.md).

```text
nginx/
├─ app.conf     static SPA, fallback index.html, cache /assets
└─ api.conf     reverse proxy :3000, WebSocket upgrade /realtime
```

Không commit chứng chỉ, khóa hay file env thật.
