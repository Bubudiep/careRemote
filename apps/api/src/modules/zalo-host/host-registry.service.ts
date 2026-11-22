import { Injectable } from "@nestjs/common";
import type { ZaloState } from "@zalocare/contracts";
import type { Namespace } from "socket.io";

export type HostLeaseEntry = {
  socketId: string;
  deviceDbId: string;
  deviceId: string;
  name: string;
  zaloState: ZaloState | null;
  /** Host đăng nhập tài khoản Zalo khác với tài khoản đã gắn workspace */
  mismatch: boolean;
  /** Đã gửi host.hello hợp lệ (đã biết tài khoản Zalo) */
  ready: boolean;
  lastSeen: Date;
};

/**
 * Lease host trong bộ nhớ (1 instance API). Chạy nhiều instance cần chuyển sang Redis
 * (socket.io redis adapter + khóa phân tán) — xem docs/DEPLOYMENT.md.
 */
@Injectable()
export class HostRegistry {
  nsp?: Namespace;
  private readonly leases = new Map<string, HostLeaseEntry>();

  get(workspaceId: string) {
    return this.leases.get(workspaceId);
  }

  set(workspaceId: string, entry: HostLeaseEntry) {
    this.leases.set(workspaceId, entry);
  }

  /** Xóa lease nếu đúng socket đang giữ */
  release(workspaceId: string, socketId: string) {
    const cur = this.leases.get(workspaceId);
    if (cur?.socketId === socketId) {
      this.leases.delete(workspaceId);
      return true;
    }
    return false;
  }

  /** Host đang giữ lease, đã hello và không lệch tài khoản → có thể nhận lệnh/đồng bộ */
  isActive(workspaceId: string, deviceDbId: string) {
    const cur = this.leases.get(workspaceId);
    return !!cur && cur.deviceDbId === deviceDbId && cur.ready && !cur.mismatch;
  }

  canDispatch(workspaceId: string) {
    const cur = this.leases.get(workspaceId);
    return !!cur && cur.ready && !cur.mismatch && cur.zaloState === "connected";
  }

  emitToHost(workspaceId: string, event: string, data: unknown) {
    const cur = this.leases.get(workspaceId);
    if (!cur || !this.nsp) return false;
    this.nsp.to(cur.socketId).emit(event, data);
    return true;
  }

  socket(workspaceId: string) {
    const cur = this.leases.get(workspaceId);
    return cur ? this.nsp?.sockets.get(cur.socketId) : undefined;
  }

  workspaces() {
    return [...this.leases.keys()];
  }
}
