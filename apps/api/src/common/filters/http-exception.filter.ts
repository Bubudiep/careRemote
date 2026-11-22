import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { Request, Response } from "express";

/** Định dạng lỗi thống nhất: { error: { code, message, details }, requestId } */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger("HttpError");

  catch(exception: unknown, host: ArgumentsHost) {
    if (host.getType() !== "http") throw exception;
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request & { requestId?: string }>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = "INTERNAL";
    let message = "Lỗi hệ thống";
    let details: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse() as any;
      if (body && typeof body === "object" && "code" in body) {
        code = body.code;
        message = body.message;
        details = body.details;
      } else {
        code = HttpStatus[status] ?? "HTTP_ERROR";
        message = typeof body === "string" ? body : (body?.message ?? exception.message);
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === "P2002") {
        status = HttpStatus.CONFLICT;
        code = "CONFLICT";
        message = "Dữ liệu đã tồn tại";
      } else if (exception.code === "P2025") {
        status = HttpStatus.NOT_FOUND;
        code = "NOT_FOUND";
        message = "Không tìm thấy";
      }
    }

    if (status >= 500) {
      // Không log body request (có thể chứa dữ liệu cá nhân)
      this.logger.error(`${req.method} ${req.path} → ${status} [${req.requestId}]`, (exception as Error)?.stack);
    }
    res.status(status).json({ error: { code, message, details }, requestId: req.requestId });
  }
}
