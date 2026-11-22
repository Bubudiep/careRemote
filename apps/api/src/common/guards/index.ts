import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import type { Role } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { IS_PUBLIC, ROLE_RANK, ROLES } from "../decorators";
import { forbidden, unauthorized } from "../errors";
import { sha256 } from "../utils/crypto";

/** Guard toàn cục: yêu cầu JWT, trừ route @Public() */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()]);
    if (isPublic) return true;
    const req = ctx.switchToHttp().getRequest();
    const header: string | undefined = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) throw unauthorized();
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; email: string; name: string }>(header.slice(7));
      req.user = { id: payload.sub, email: payload.email, name: payload.name };
      return true;
    } catch {
      throw unauthorized("TOKEN_INVALID", "Token không hợp lệ hoặc đã hết hạn");
    }
  }
}

/** Kiểm tra membership qua header X-Workspace-Id và vai trò tối thiểu (@MinRole) */
@Injectable()
export class WorkspaceGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const workspaceId = req.headers["x-workspace-id"];
    if (!req.user) throw unauthorized();
    if (typeof workspaceId !== "string" || !/^[0-9a-f-]{36}$/i.test(workspaceId)) {
      throw forbidden("WORKSPACE_REQUIRED", "Thiếu header X-Workspace-Id");
    }
    const member = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: req.user.id } },
    });
    if (!member) throw forbidden("NOT_A_MEMBER", "Bạn không thuộc workspace này");
    const min = this.reflector.getAllAndOverride<Role | undefined>(ROLES, [ctx.getHandler(), ctx.getClass()]) ?? "viewer";
    if (ROLE_RANK[member.role] < ROLE_RANK[min]) throw forbidden("ROLE_TOO_LOW", "Vai trò không đủ quyền");
    req.workspace = { id: workspaceId, role: member.role };
    return true;
  }
}

/** Xác thực HostAgent bằng header `Authorization: Device <token>` */
@Injectable()
export class DeviceAuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const header: string | undefined = req.headers.authorization;
    if (!header?.startsWith("Device ")) throw unauthorized("DEVICE_TOKEN_REQUIRED", "Thiếu device token");
    const device = await this.prisma.hostDevice.findUnique({ where: { tokenHash: sha256(header.slice(7)) } });
    if (!device || device.revokedAt) throw unauthorized("DEVICE_REVOKED", "Device token không hợp lệ hoặc đã bị thu hồi");
    req.device = { id: device.id, deviceId: device.deviceId, workspaceId: device.workspaceId, name: device.name };
    return true;
  }
}
