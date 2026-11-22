import { z } from "zod";

export const IdSchema = z.string().min(1).max(64);
export const IsoDateSchema = z.string().datetime({ offset: true });

export const PageQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
export type PageQuery = z.infer<typeof PageQuerySchema>;

export type Page<T> = { items: T[]; nextCursor: string | null };

export const RoleSchema = z.enum(["owner", "admin", "agent", "viewer"]);
export type Role = z.infer<typeof RoleSchema>;

export const ApiErrorSchema = z.object({
  error: z.object({ code: z.string(), message: z.string(), details: z.unknown().optional() }),
  requestId: z.string().optional(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;
