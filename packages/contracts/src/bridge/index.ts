import { z } from "zod";

/** Phiên bản protocol giữa UI ⇄ Rust ⇄ zalo-inject. Tăng khi đổi không tương thích. */
export const PROTOCOL_V = 1;

export const ZaloStateSchema = z.enum([
  "starting",
  "login_required",
  "connected",
  "reconnecting",
  "disconnected",
  "error",
]);
export type ZaloState = z.infer<typeof ZaloStateSchema>;

export const ZaloProfileSchema = z.object({
  zaloUid: z.string().min(1).max(128),
  name: z.string().max(256),
  avatarUrl: z.string().max(2048).optional(),
});
export type ZaloProfile = z.infer<typeof ZaloProfileSchema>;

export const ZaloStatusSchema = z.object({
  state: ZaloStateSchema,
  profile: ZaloProfileSchema.optional(),
  reason: z.string().optional(),
});
export type ZaloStatus = z.infer<typeof ZaloStatusSchema>;

export const ZaloThreadSchema = z.object({
  threadId: z.string().min(1).max(128),
  kind: z.enum(["user", "group"]),
  name: z.string().max(512),
  avatarUrl: z.string().max(2048).optional(),
  lastMessageAt: z.string().optional(),
  lastMessagePreview: z.string().max(2000).optional(),
  unread: z.number().int().min(0),
});
export type ZaloThread = z.infer<typeof ZaloThreadSchema>;

export const AttachmentSchema = z.object({
  kind: z.string().max(32),
  url: z.string().max(4096).optional(),
  name: z.string().max(512).optional(),
  size: z.number().int().optional(),
});

export const MessageKindSchema = z.enum(["text", "image", "file", "sticker", "link", "system"]);

export const ZaloMessageSchema = z.object({
  zaloMsgId: z.string().min(1).max(256),
  threadId: z.string().min(1).max(128),
  direction: z.enum(["in", "out"]),
  senderUid: z.string().max(128),
  senderName: z.string().max(512).optional(),
  sentAt: z.string(),
  kind: MessageKindSchema,
  text: z.string().max(20000).optional(),
  attachments: z.array(AttachmentSchema).max(50).optional(),
  commandId: z.string().optional(),
});
export type ZaloMessage = z.infer<typeof ZaloMessageSchema>;

export const HostBackendStateSchema = z.enum(["unconfigured", "connecting", "online", "offline", "lease_denied", "revoked"]);

export const HostStatusSchema = z.object({
  configured: z.boolean(),
  backend: HostBackendStateSchema,
  zalo: ZaloStatusSchema,
  paused: z.boolean(),
  outboxSize: z.number().int(),
  pendingCommands: z.number().int(),
  lastSyncAt: z.string().optional(),
  pageDriftMs: z.number().optional(),
});
export type HostStatus = z.infer<typeof HostStatusSchema>;

export const BackgroundSettingsSchema = z.object({
  autostart: z.boolean(),
  closeToTray: z.boolean(),
  keepAwake: z.boolean(),
  hideStrategy: z.enum(["hide", "offscreen"]),
  autoOpenUnread: z.boolean(),
  dailyReloadAt: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
});
export type BackgroundSettings = z.infer<typeof BackgroundSettingsSchema>;

export const AppInfoSchema = z.object({
  version: z.string(),
  platform: z.string(),
  protocolV: z.number().int(),
  mode: z.enum(["host", "client"]),
  deviceId: z.string(),
});
export type AppInfo = z.infer<typeof AppInfoSchema>;

export const BridgeErrorCodeSchema = z.enum([
  "NOT_HOST",
  "NOT_CONFIGURED",
  "NOT_CONNECTED",
  "LEASE_DENIED",
  "THREAD_NOT_FOUND",
  "RATE_LIMITED",
  "ADAPTER_UNSUPPORTED",
  "TIMEOUT",
  "INVALID_ARGS",
  "INTERNAL",
]);
export type BridgeErrorCode = z.infer<typeof BridgeErrorCodeSchema>;
export const BridgeErrorSchema = z.object({ code: BridgeErrorCodeSchema, message: z.string(), retryable: z.boolean() });
export type BridgeError = z.infer<typeof BridgeErrorSchema>;

/* ---------- zalo-inject ⇄ Rust ---------- */

export const InjectEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("inject.heartbeat"), payload: z.object({ selectorVersion: z.string(), driftMs: z.number(), visible: z.boolean() }) }),
  z.object({
    type: z.literal("auth.state"),
    payload: z.object({ state: z.enum(["qr_required", "logged_in", "logged_out"]), profile: ZaloProfileSchema.optional() }),
  }),
  z.object({ type: z.literal("threads.changed"), payload: z.object({ threads: z.array(ZaloThreadSchema).max(500) }) }),
  z.object({ type: z.literal("message.received"), payload: z.object({ message: ZaloMessageSchema }) }),
  z.object({
    type: z.literal("message.updated"),
    payload: z.object({ zaloMsgId: z.string(), status: z.string().optional(), recalled: z.boolean().optional() }),
  }),
  z.object({
    type: z.literal("action.result"),
    payload: z.object({ commandId: z.string(), ok: z.boolean(), zaloMsgId: z.string().optional(), error: z.string().optional() }),
  }),
  z.object({ type: z.literal("adapter.error"), payload: z.object({ selectorVersion: z.string(), code: z.string() }) }),
]);
export type InjectEvent = z.infer<typeof InjectEventSchema>;

export const EnvelopeSchema = z.object({
  v: z.literal(PROTOCOL_V),
  id: z.string().min(1).max(64),
  ts: z.string(),
});
export type Envelope<E extends { type: string; payload: unknown } = InjectEvent> = z.infer<typeof EnvelopeSchema> & E;

export const InjectActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("action.send_message"), payload: z.object({ commandId: z.string(), threadId: z.string(), text: z.string().min(1).max(5000) }) }),
  z.object({ type: z.literal("action.open_thread"), payload: z.object({ commandId: z.string(), threadId: z.string() }) }),
  z.object({ type: z.literal("action.load_history"), payload: z.object({ commandId: z.string(), threadId: z.string() }) }),
  z.object({ type: z.literal("ping"), payload: z.object({}) }),
]);
export type InjectAction = z.infer<typeof InjectActionSchema>;
