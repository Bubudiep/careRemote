import { z } from "zod";
import { ZaloMessageSchema, ZaloProfileSchema, ZaloStateSchema, ZaloThreadSchema } from "../bridge";

/* ---------- Namespace /host (HostAgent ⇄ backend) ---------- */

export const HostCommandTypeSchema = z.enum(["send_message", "load_history", "open_thread"]);
export type HostCommandType = z.infer<typeof HostCommandTypeSchema>;

export const HostCommandSchema = z.object({
  commandId: z.string(),
  type: HostCommandTypeSchema,
  payload: z.record(z.unknown()),
  expiresAt: z.string(),
});
export type HostCommand = z.infer<typeof HostCommandSchema>;

export const HostCommandResultSchema = z.object({
  commandId: z.string(),
  ok: z.boolean(),
  zaloMsgId: z.string().optional(),
  error: z.string().max(1000).optional(),
});
export type HostCommandResult = z.infer<typeof HostCommandResultSchema>;

export const HostHelloSchema = z.object({
  profile: ZaloProfileSchema.optional(),
  appVersion: z.string(),
  selectorVersion: z.string().optional(),
});
export type HostHello = z.infer<typeof HostHelloSchema>;

export const HostHeartbeatSchema = z.object({
  zaloState: ZaloStateSchema,
  outboxSize: z.number().int(),
  pendingCommands: z.number().int(),
  driftMs: z.number().optional(),
  recoveries24h: z.number().int().optional(),
  selectorVersion: z.string().optional(),
});
export type HostHeartbeat = z.infer<typeof HostHeartbeatSchema>;

export const HostLeaseSchema = z.object({
  granted: z.boolean(),
  takenBy: z.object({ deviceId: z.string(), name: z.string() }).optional(),
  reason: z.string().optional(),
});
export type HostLease = z.infer<typeof HostLeaseSchema>;

export const HOST_EVENTS = {
  lease: "host.lease",
  hello: "host.hello",
  revoked: "host.revoked",
  heartbeat: "host.heartbeat",
  command: "host.command",
  commandResult: "host.command_result",
} as const;

/* ---------- Sync batch (HostAgent → REST) ---------- */

export const SyncBatchSchema = z.object({
  upToSeq: z.number().int().min(0),
  threads: z.array(ZaloThreadSchema).max(500).default([]),
  messages: z.array(ZaloMessageSchema).max(500).default([]),
  updates: z
    .array(z.object({ zaloMsgId: z.string(), status: z.string().optional(), recalled: z.boolean().optional() }))
    .max(500)
    .default([]),
});
export type SyncBatch = z.infer<typeof SyncBatchSchema>;

/* ---------- Namespace /realtime (users) ---------- */

export const REALTIME_EVENTS = {
  messageCreated: "message.created",
  messageUpdated: "message.updated",
  conversationUpdated: "conversation.updated",
  assignmentChanged: "assignment.changed",
  zaloHostStatus: "zalo_host.status",
  joinConversation: "conversation.join",
  leaveConversation: "conversation.leave",
} as const;

export const ZaloHostStatusEventSchema = z.object({
  online: z.boolean(),
  zaloState: ZaloStateSchema.nullable(),
  deviceId: z.string().nullable(),
  deviceName: z.string().nullable(),
  lastSeenAt: z.string().nullable(),
  profile: ZaloProfileSchema.nullable(),
});
export type ZaloHostStatusEvent = z.infer<typeof ZaloHostStatusEventSchema>;
