import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { AuthResponse, LoginInput, RegisterInput, WorkspaceDto } from "@zalocare/contracts";
import bcrypt from "bcryptjs";
import { conflict, unauthorized } from "../../common/errors";
import { randomToken, sha256, slugify } from "../../common/utils/crypto";
import { env } from "../../config/env";
import { PrismaService } from "../../database/prisma.service";

type Session = AuthResponse & { refreshToken: string };

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(input: RegisterInput, userAgent?: string): Promise<Session> {
    const email = input.email.toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email } })) throw conflict("EMAIL_TAKEN", "Email đã được sử dụng");
    const passwordHash = await bcrypt.hash(input.password, 11);
    const user = await this.prisma.$transaction(async (tx) => {
      const u = await tx.user.create({ data: { email, name: input.name, passwordHash } });
      const ws = await tx.workspace.create({
        data: { name: input.workspaceName, slug: `${slugify(input.workspaceName)}-${randomToken(4).toLowerCase()}` },
      });
      await tx.workspaceMember.create({ data: { workspaceId: ws.id, userId: u.id, role: "owner" } });
      return u;
    });
    return this.issue(user.id, userAgent);
  }

  async login(input: LoginInput, userAgent?: string): Promise<Session> {
    const user = await this.prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
    // So sánh cả khi user không tồn tại để không lộ thông tin qua thời gian phản hồi
    const ok = await bcrypt.compare(input.password, user?.passwordHash ?? "$2a$11$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv");
    if (!user || !ok) throw unauthorized("INVALID_CREDENTIALS", "Email hoặc mật khẩu không đúng");
    return this.issue(user.id, userAgent);
  }

  /** Xoay vòng refresh token: token cũ bị thu hồi, phát token mới */
  async refresh(refreshToken: string | undefined, userAgent?: string): Promise<Session> {
    if (!refreshToken) throw unauthorized("REFRESH_REQUIRED", "Phiên đăng nhập đã hết hạn");
    const row = await this.prisma.refreshToken.findUnique({ where: { tokenHash: sha256(refreshToken) } });
    if (!row || row.expiresAt < new Date()) throw unauthorized("REFRESH_INVALID", "Phiên đăng nhập đã hết hạn");
    if (row.revokedAt) {
      // Token đã dùng bị dùng lại → nghi bị đánh cắp: thu hồi toàn bộ phiên của user
      await this.prisma.refreshToken.updateMany({ where: { userId: row.userId, revokedAt: null }, data: { revokedAt: new Date() } });
      throw unauthorized("REFRESH_REUSED", "Phiên đăng nhập không hợp lệ, vui lòng đăng nhập lại");
    }
    await this.prisma.refreshToken.update({ where: { id: row.id }, data: { revokedAt: new Date() } });
    return this.issue(row.userId, userAgent);
  }

  async logout(refreshToken: string | undefined) {
    if (!refreshToken) return;
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: sha256(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async me(userId: string): Promise<Omit<AuthResponse, "accessToken">> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return { user: this.userDto(user), workspaces: await this.workspacesOf(userId) };
  }

  private async issue(userId: string, userAgent?: string): Promise<Session> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const accessToken = await this.jwt.signAsync({ sub: user.id, email: user.email, name: user.name });
    const refreshToken = randomToken(48);
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: sha256(refreshToken),
        userAgent: userAgent?.slice(0, 255),
        expiresAt: new Date(Date.now() + env.REFRESH_TTL_DAYS * 86400_000),
      },
    });
    return { accessToken, refreshToken, user: this.userDto(user), workspaces: await this.workspacesOf(userId) };
  }

  private userDto(u: { id: string; email: string; name: string; avatarUrl: string | null }) {
    return { id: u.id, email: u.email, name: u.name, avatarUrl: u.avatarUrl };
  }

  private async workspacesOf(userId: string): Promise<WorkspaceDto[]> {
    const rows = await this.prisma.workspaceMember.findMany({
      where: { userId },
      include: { workspace: true },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((m) => ({ id: m.workspace.id, name: m.workspace.name, slug: m.workspace.slug, role: m.role }));
  }
}
