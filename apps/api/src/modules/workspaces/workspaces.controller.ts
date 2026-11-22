import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { AddMemberSchema, CreateWorkspaceSchema, UpdateMemberSchema, type MemberDto } from "@zalocare/contracts";
import type { z } from "zod";
import { CurrentUser, CurrentWorkspace, MinRole, type AuthUser, type WorkspaceCtx } from "../../common/decorators";
import { badRequest, forbidden, notFound } from "../../common/errors";
import { WorkspaceGuard } from "../../common/guards";
import { zod } from "../../common/pipes/zod.pipe";
import { randomToken, slugify } from "../../common/utils/crypto";
import { PrismaService } from "../../database/prisma.service";

@Controller("workspaces")
export class WorkspacesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async mine(@CurrentUser() user: AuthUser) {
    const rows = await this.prisma.workspaceMember.findMany({ where: { userId: user.id }, include: { workspace: true } });
    return rows.map((m) => ({ id: m.workspace.id, name: m.workspace.name, slug: m.workspace.slug, role: m.role }));
  }

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body(zod(CreateWorkspaceSchema)) body: z.infer<typeof CreateWorkspaceSchema>) {
    const ws = await this.prisma.workspace.create({
      data: {
        name: body.name,
        slug: `${slugify(body.name)}-${randomToken(4).toLowerCase()}`,
        members: { create: { userId: user.id, role: "owner" } },
      },
    });
    return { id: ws.id, name: ws.name, slug: ws.slug, role: "owner" };
  }

  @UseGuards(WorkspaceGuard)
  @Get("current/members")
  async members(@CurrentWorkspace() ws: WorkspaceCtx): Promise<MemberDto[]> {
    const rows = await this.prisma.workspaceMember.findMany({
      where: { workspaceId: ws.id },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((m) => ({ userId: m.userId, email: m.user.email, name: m.user.name, role: m.role }));
  }

  /** Thêm thành viên đã có tài khoản (mời qua email: làm sau) */
  @UseGuards(WorkspaceGuard)
  @MinRole("admin")
  @Post("current/members")
  async addMember(@CurrentWorkspace() ws: WorkspaceCtx, @Body(zod(AddMemberSchema)) body: z.infer<typeof AddMemberSchema>) {
    const user = await this.prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (!user) throw notFound("USER_NOT_FOUND", "Chưa có tài khoản với email này — người đó cần đăng ký trước");
    const m = await this.prisma.workspaceMember.create({ data: { workspaceId: ws.id, userId: user.id, role: body.role } });
    return { userId: user.id, email: user.email, name: user.name, role: m.role };
  }

  @UseGuards(WorkspaceGuard)
  @MinRole("admin")
  @Patch("current/members/:userId")
  async updateMember(
    @CurrentWorkspace() ws: WorkspaceCtx,
    @Param("userId") userId: string,
    @Body(zod(UpdateMemberSchema)) body: z.infer<typeof UpdateMemberSchema>,
  ) {
    const target = await this.prisma.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId: ws.id, userId } } });
    if (!target) throw notFound("MEMBER_NOT_FOUND");
    if (target.role === "owner") throw forbidden("CANNOT_CHANGE_OWNER", "Không thể đổi vai trò owner");
    await this.prisma.workspaceMember.update({ where: { workspaceId_userId: { workspaceId: ws.id, userId } }, data: { role: body.role } });
    return { ok: true };
  }

  @UseGuards(WorkspaceGuard)
  @MinRole("admin")
  @HttpCode(204)
  @Delete("current/members/:userId")
  async removeMember(@CurrentWorkspace() ws: WorkspaceCtx, @CurrentUser() me: AuthUser, @Param("userId") userId: string) {
    if (userId === me.id) throw badRequest("CANNOT_REMOVE_SELF", "Không thể tự xóa mình");
    const target = await this.prisma.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId: ws.id, userId } } });
    if (!target) throw notFound("MEMBER_NOT_FOUND");
    if (target.role === "owner") throw forbidden("CANNOT_REMOVE_OWNER", "Không thể xóa owner");
    await this.prisma.workspaceMember.delete({ where: { workspaceId_userId: { workspaceId: ws.id, userId } } });
  }
}
