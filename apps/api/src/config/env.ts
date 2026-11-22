import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().default(3000),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET phải ≥ 32 ký tự"),
  JWT_ACCESS_TTL: z.string().default("15m"),
  REFRESH_TTL_DAYS: z.coerce.number().int().min(1).default(30),
  CORS_ORIGINS: z
    .string()
    .default("http://localhost:5173")
    .transform((s) => s.split(",").map((x) => x.trim()).filter(Boolean)),
  COOKIE_DOMAIN: z
    .string()
    .optional()
    .transform((s) => (s ? s : undefined)),
  LOG_LEVEL: z.string().default("info"),
  HOST_HEARTBEAT_SEC: z.coerce.number().int().min(5).default(15),
  HOST_COMMAND_TTL: z.coerce.number().int().min(30).default(600),
  HOST_SEND_RATE_PER_MIN: z.coerce.number().int().min(1).default(20),
});

export type Env = z.infer<typeof EnvSchema>;

function load(): Env {
  const r = EnvSchema.safeParse(process.env);
  if (!r.success) {
    const lines = r.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    // Fail-fast: không khởi động với cấu hình sai
    console.error(`Cấu hình môi trường không hợp lệ:\n${lines}\nXem apps/api/.env.example`);
    process.exit(1);
  }
  return r.data;
}

export const env: Env = load();
export const isProd = env.NODE_ENV === "production";
