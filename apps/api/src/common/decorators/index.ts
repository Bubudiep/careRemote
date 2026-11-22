import { createParamDecorator, ExecutionContext, SetMetadata } from "@nestjs/common";
import type { Role } from "@prisma/client";

export type AuthUser = { id: string; email: string; name: string };
export type WorkspaceCtx = { id: string; role: Role };
export type DeviceCtx = { id: string; deviceId: string; workspaceId: string; name: string };

export const IS_PUBLIC = "isPublic";
export const Public = () => SetMetadata(IS_PUBLIC, true);

export const ROLES = "roles";
/** Vai trò tối thiểu được phép (owner > admin > agent > viewer) */
export const MinRole = (role: Role) => SetMetadata(ROLES, role);

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthUser => {
  return ctx.switchToHttp().getRequest().user;
});

export const CurrentWorkspace = createParamDecorator((_: unknown, ctx: ExecutionContext): WorkspaceCtx => {
  return ctx.switchToHttp().getRequest().workspace;
});

export const CurrentDevice = createParamDecorator((_: unknown, ctx: ExecutionContext): DeviceCtx => {
  return ctx.switchToHttp().getRequest().device;
});

export const ROLE_RANK: Record<Role, number> = { viewer: 0, agent: 1, admin: 2, owner: 3 };
