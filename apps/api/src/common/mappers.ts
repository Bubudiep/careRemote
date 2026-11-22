import type { ConversationDto, CustomerDto, MessageDto, NoteDto, TagDto } from "@zalocare/contracts";
import type { Assignment, Conversation, Customer, CustomerTag, Message, Note, Tag, User } from "@prisma/client";

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

export const toTag = (t: Tag): TagDto => ({ id: t.id, name: t.name, color: t.color });

export type CustomerWithRels = Customer & { tags?: (CustomerTag & { tag: Tag })[] };

export const toCustomer = (c: CustomerWithRels, owner?: Pick<User, "id" | "name"> | null): CustomerDto => ({
  id: c.id,
  fullName: c.fullName,
  phone: c.phone,
  email: c.email,
  zaloUid: c.zaloUid,
  avatarUrl: c.avatarUrl,
  stage: c.stage,
  owner: owner ? { id: owner.id, name: owner.name } : null,
  tags: (c.tags ?? []).map((ct) => toTag(ct.tag)),
  lastInteractionAt: iso(c.lastInteractionAt),
  createdAt: c.createdAt.toISOString(),
});

export const conversationInclude = {
  customer: { include: { tags: { include: { tag: true } } } },
  assignments: { where: { unassignedAt: null }, include: { user: { select: { id: true, name: true } } }, take: 1 },
} as const;

export type ConversationWithRels = Conversation & {
  customer: CustomerWithRels | null;
  assignments: (Assignment & { user: Pick<User, "id" | "name"> })[];
};

export const toConversation = (c: ConversationWithRels): ConversationDto => ({
  id: c.id,
  zaloThreadId: c.zaloThreadId,
  kind: c.kind === "group" ? "group" : "user",
  title: c.title,
  avatarUrl: c.avatarUrl,
  status: c.status,
  unreadCount: c.unreadCount,
  lastMessageAt: iso(c.lastMessageAt),
  lastMessagePreview: c.lastMessagePreview,
  assignee: c.assignments[0] ? { id: c.assignments[0].user.id, name: c.assignments[0].user.name } : null,
  customer: c.customer
    ? { id: c.customer.id, fullName: c.customer.fullName, tags: (c.customer.tags ?? []).map((t) => toTag(t.tag)) }
    : null,
});

export const messageInclude = { sentBy: { select: { id: true, name: true } } } as const;

export const toMessage = (m: Message & { sentBy?: Pick<User, "id" | "name"> | null }): MessageDto => ({
  id: m.id,
  conversationId: m.conversationId,
  zaloMsgId: m.zaloMsgId,
  clientMsgId: m.clientMsgId,
  direction: m.direction,
  senderName: m.senderName,
  kind: m.kind,
  text: m.text,
  attachments: m.attachments,
  sentAt: m.sentAt.toISOString(),
  status: m.status,
  error: m.error,
  sentBy: m.sentBy ? { id: m.sentBy.id, name: m.sentBy.name } : null,
});

export const toNote = (n: Note & { author: Pick<User, "id" | "name"> }): NoteDto => ({
  id: n.id,
  body: n.body,
  author: { id: n.author.id, name: n.author.name },
  createdAt: n.createdAt.toISOString(),
});
