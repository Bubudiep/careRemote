import { Injectable } from "@nestjs/common";
import { REALTIME_EVENTS, type HostDeviceDto, type ZaloHostDto, type ZaloHostStatusEvent } from "@zalocare/contracts";
import { conflict, notFound } from "../../common/errors";
import { randomToken, sha256 } from "../../common/utils/crypto";
import { PrismaService } from "../../database/prisma.service";
import { RealtimeService } from "../realtime/realtime";
import { HostRegistry } from "./host-registry.service";

@Injectable()
export class ZaloHostService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: HostRegistry,
    private readonly rt: RealtimeService,
  ) {}

  async status(workspaceId: string): Promise<ZaloHostDto> {
    const account = await this.prisma.zaloAccount.findUnique({ where: { workspaceId } });
    const lease = this.registry.get(workspaceId);
    return {
      account: account ? { zaloUid: account.zaloUid, displayName: account.displayName, avatarUrl: account.avatarUrl } : null,
      online: !!lease?.ready,
      zaloState: lease?.zaloState ?? null,
      activeDevice: lease ? { deviceId: lease.deviceId, name: lease.name } : null,
      lastSeenAt: (lease?.lastSeen ?? account?.hostLastSeenAt)?.toISOString() ?? null,
    };
  }

  async broadcastStatus(workspaceId: string) {
    const s = await this.status(workspaceId);
    const evt: ZaloHostStatusEvent = {
      online: s.online,
      zaloState: (s.zaloState as ZaloHostStatusEvent["zaloState"]) ?? null,
      deviceId: s.activeDevice?.deviceId ?? null,
      deviceName: s.activeDevice?.name ?? null,
      lastSeenAt: s.lastSeenAt,
      profile: s.account ? { zaloUid: s.account.zaloUid, name: s.account.displayName, avatarUrl: s.account.avatarUrl ?? undefined } : null,
    };
    this.rt.toWorkspace(workspaceId, REALTIME_EVENTS.zaloHostStatus, evt);
  }

  async listDevices(workspaceId: string): Promise<HostDeviceDto[]> {
    const rows = await this.prisma.hostDevice.findMany({ where: { workspaceId }, orderBy: { createdAt: "desc" } });
    const lease = this.registry.get(workspaceId);
    return rows.map((d) => ({
      id: d.id,
      deviceId: d.deviceId,
      name: d.name,
      lastSeenAt: d.lastSeenAt?.toISOString() ?? null,
      revokedAt: d.revokedAt?.toISOString() ?? null,
      active: lease?.deviceDbId === d.id,
    }));
  }

  /** Cấp device token (trả về một lần). Cùng deviceId → cấp lại token mới, token cũ mất hiệu lực. */
  async createDevice(workspaceId: string, userId: string, deviceId: string, name: string) {
    const token = randomToken(32);
    const device = await this.prisma.hostDevice.upsert({
      where: { workspaceId_deviceId: { workspaceId, deviceId } },
      create: { workspaceId, deviceId, name, tokenHash: sha256(token), createdById: userId },
      update: { name, tokenHash: sha256(token), revokedAt: null, createdById: userId },
    });
    // Token cũ của cùng máy (nếu đang kết nối) bị ngắt
    const lease = this.registry.get(workspaceId);
    if (lease?.deviceDbId === device.id) this.registry.socket(workspaceId)?.disconnect(true);
    return { deviceToken: token, device: { id: device.id, deviceId, name } };
  }

  async revokeDevice(workspaceId: string, id: string) {
    const d = await this.prisma.hostDevice.findFirst({ where: { id, workspaceId } });
    if (!d) throw notFound("DEVICE_NOT_FOUND");
    await this.prisma.hostDevice.update({ where: { id }, data: { revokedAt: new Date() } });
    const lease = this.registry.get(workspaceId);
    if (lease?.deviceDbId === id) {
      this.registry.emitToHost(workspaceId, "host.revoked", { reason: "device_revoked" });
      this.registry.socket(workspaceId)?.disconnect(true);
    }
  }

  /** Admin cho máy khác chiếm quyền host: ngắt host hiện tại */
  async takeover(workspaceId: string) {
    const lease = this.registry.get(workspaceId);
    if (!lease) return { ok: true, message: "Không có host nào đang online — máy mới có thể kết nối ngay" };
    this.registry.emitToHost(workspaceId, "host.revoked", { reason: "takeover" });
    this.registry.socket(workspaceId)?.disconnect(true);
    this.registry.release(workspaceId, lease.socketId);
    await this.broadcastStatus(workspaceId);
    return { ok: true };
  }

  /** Gỡ tài khoản Zalo khỏi workspace (giữ hội thoại cũ? — không: xóa theo cascade). */
  async removeAccount(workspaceId: string) {
    const lease = this.registry.get(workspaceId);
    if (lease) {
      this.registry.emitToHost(workspaceId, "host.revoked", { reason: "account_removed" });
      this.registry.socket(workspaceId)?.disconnect(true);
    }
    const account = await this.prisma.zaloAccount.findUnique({ where: { workspaceId } });
    if (!account) throw notFound("ZALO_ACCOUNT_NOT_FOUND");
    const convs = await this.prisma.conversation.count({ where: { zaloAccountId: account.id } });
    if (convs > 0) throw conflict("HAS_CONVERSATIONS", "Tài khoản đã có hội thoại — cần xác nhận xóa dữ liệu (chưa hỗ trợ)");
    await this.prisma.zaloAccount.delete({ where: { id: account.id } });
    await this.broadcastStatus(workspaceId);
  }
}
