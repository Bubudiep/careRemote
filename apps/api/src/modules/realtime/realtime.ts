import { Injectable, Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
} from "@nestjs/websockets";
import { REALTIME_EVENTS } from "@zalocare/contracts";
import type { Namespace, Socket } from "socket.io";
import { env } from "../../config/env";
import { PrismaService } from "../../database/prisma.service";

/** Giữ tham chiếu namespace /realtime để các service khác phát sự kiện */
@Injectable()
export class RealtimeService {
  nsp?: Namespace;

  toWorkspace(workspaceId: string, event: string, data: unknown) {
    this.nsp?.to(`ws:${workspaceId}`).emit(event, data);
  }

  toConversation(conversationId: string, event: string, data: unknown) {
    this.nsp?.to(`conv:${conversationId}`).emit(event, data);
  }
}

@WebSocketGateway({ namespace: "/realtime", cors: { origin: env.CORS_ORIGINS, credentials: true } })
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection {
  private readonly logger = new Logger("Realtime");

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly rt: RealtimeService,
  ) {}

  afterInit(nsp: Namespace) {
    this.rt.nsp = nsp;
  }

  async handleConnection(socket: Socket) {
    try {
      const { token, workspaceId } = socket.handshake.auth as { token?: string; workspaceId?: string };
      if (!token || !workspaceId) throw new Error("missing auth");
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token);
      const member = await this.prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId: payload.sub } },
      });
      if (!member) throw new Error("not a member");
      socket.data = { userId: payload.sub, workspaceId };
      await socket.join(`ws:${workspaceId}`);
    } catch (e) {
      this.logger.debug(`Từ chối kết nối realtime: ${(e as Error).message}`);
      socket.emit("error", { code: "UNAUTHORIZED" });
      socket.disconnect(true);
    }
  }

  @SubscribeMessage(REALTIME_EVENTS.joinConversation)
  async join(@ConnectedSocket() socket: Socket, @MessageBody() body: { conversationId?: string }) {
    if (!body?.conversationId) return { ok: false };
    const conv = await this.prisma.conversation.findFirst({
      where: { id: body.conversationId, workspaceId: socket.data.workspaceId },
      select: { id: true },
    });
    if (!conv) return { ok: false };
    await socket.join(`conv:${conv.id}`);
    return { ok: true };
  }

  @SubscribeMessage(REALTIME_EVENTS.leaveConversation)
  async leave(@ConnectedSocket() socket: Socket, @MessageBody() body: { conversationId?: string }) {
    if (body?.conversationId) await socket.leave(`conv:${body.conversationId}`);
    return { ok: true };
  }
}
