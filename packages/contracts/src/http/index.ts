import { z } from "zod";
import { RoleSchema } from "../schemas";

/* ---------- Auth ---------- */

export const RegisterSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(200),
  name: z.string().min(1).max(120),
  workspaceName: z.string().min(1).max(120),
});
export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({ email: z.string().email(), password: z.string().min(1).max(200) });
export type LoginInput = z.infer<typeof LoginSchema>;

export type UserDto = { id: string; email: string; name: string; avatarUrl: string | null };
export type WorkspaceDto = { id: string; name: string; slug: string; role: z.infer<typeof RoleSchema> };
export type AuthResponse = { accessToken: string; user: UserDto; workspaces: WorkspaceDto[] };

/* ---------- Workspaces ---------- */

export const CreateWorkspaceSchema = z.object({ name: z.string().min(1).max(120) });
export const AddMemberSchema = z.object({ email: z.string().email(), role: RoleSchema.exclude(["owner"]) });
export const UpdateMemberSchema = z.object({ role: RoleSchema.exclude(["owner"]) });
export type MemberDto = { userId: string; email: string; name: string; role: z.infer<typeof RoleSchema> };

/* ---------- Zalo host ---------- */

export const CreateHostDeviceSchema = z.object({ deviceId: z.string().min(1).max(64), name: z.string().min(1).max(120) });
export type HostDeviceDto = { id: string; deviceId: string; name: string; lastSeenAt: string | null; revokedAt: string | null; active: boolean };
export type ZaloHostDto = {
  account: { zaloUid: string; displayName: string; avatarUrl: string | null } | null;
  online: boolean;
  zaloState: string | null;
  activeDevice: { deviceId: string; name: string } | null;
  lastSeenAt: string | null;
};

/* ---------- Conversations & messages ---------- */

export const ConversationStatusSchema = z.enum(["open", "pending", "closed"]);
export const ListConversationsSchema = z.object({
  status: ConversationStatusSchema.optional(),
  assignee: z.union([z.literal("me"), z.literal("none"), z.string()]).optional(),
  tagId: z.string().optional(),
  q: z.string().max(200).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});
export const UpdateConversationSchema = z.object({
  status: ConversationStatusSchema.optional(),
  customerId: z.string().nullable().optional(),
});
export const AssignSchema = z.object({ userId: z.string().nullable() });

export type ConversationDto = {
  id: string;
  zaloThreadId: string;
  kind: "user" | "group";
  title: string;
  avatarUrl: string | null;
  status: z.infer<typeof ConversationStatusSchema>;
  unreadCount: number;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  assignee: { id: string; name: string } | null;
  customer: { id: string; fullName: string; tags: TagDto[] } | null;
};

export const SendMessageSchema = z.object({
  text: z.string().trim().min(1).max(5000),
  clientMsgId: z.string().min(1).max(64),
});
export type MessageStatus = "queued" | "dispatched" | "sent" | "failed" | "expired" | "received" | "recalled";
export type MessageDto = {
  id: string;
  conversationId: string;
  zaloMsgId: string | null;
  clientMsgId: string | null;
  direction: "in" | "out";
  senderName: string | null;
  kind: string;
  text: string | null;
  attachments: unknown;
  sentAt: string;
  status: MessageStatus;
  error: string | null;
  sentBy: { id: string; name: string } | null;
};

/* ---------- Customers, tags, notes ---------- */

export const CustomerStageSchema = z.enum(["new", "contacted", "qualified", "won", "lost"]);
export const CreateCustomerSchema = z.object({
  fullName: z.string().min(1).max(200),
  phone: z.string().max(32).optional(),
  email: z.string().email().optional(),
  stage: CustomerStageSchema.default("new"),
});
export const UpdateCustomerSchema = z.object({
  fullName: z.string().min(1).max(200).optional(),
  phone: z.string().max(32).nullable().optional(),
  email: z.string().email().nullable().optional(),
  stage: CustomerStageSchema.optional(),
  ownerUserId: z.string().nullable().optional(),
});
export const ListCustomersSchema = z.object({
  q: z.string().max(200).optional(),
  tagId: z.string().optional(),
  stage: CustomerStageSchema.optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});
export type CustomerDto = {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  zaloUid: string | null;
  avatarUrl: string | null;
  stage: z.infer<typeof CustomerStageSchema>;
  owner: { id: string; name: string } | null;
  tags: TagDto[];
  lastInteractionAt: string | null;
  createdAt: string;
};

export const TagSchema = z.object({ name: z.string().min(1).max(60), color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#3b82f6") });
export const SetTagsSchema = z.object({ tagIds: z.array(z.string()).max(50) });
export type TagDto = { id: string; name: string; color: string };

export const NoteSchema = z.object({ body: z.string().trim().min(1).max(5000) });
export type NoteDto = { id: string; body: string; author: { id: string; name: string }; createdAt: string };
