import { Controller, Get, HttpException, HttpStatus } from "@nestjs/common";
import { Public } from "../../common/decorators";
import { PrismaService } from "../../database/prisma.service";

@Public()
@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /** Liveness: tiến trình còn sống */
  @Get()
  live() {
    return { status: "ok", uptime: Math.round(process.uptime()) };
  }

  /** Readiness: database sẵn sàng */
  @Get("ready")
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: "ok", database: "up" };
    } catch {
      throw new HttpException({ code: "DB_DOWN", message: "Database không sẵn sàng" }, HttpStatus.SERVICE_UNAVAILABLE);
    }
  }
}
