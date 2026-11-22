import { HttpException, HttpStatus } from "@nestjs/common";

export class AppError extends HttpException {
  constructor(
    status: HttpStatus,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super({ code, message, details }, status);
  }
}

export const notFound = (code: string, message = "Không tìm thấy") => new AppError(HttpStatus.NOT_FOUND, code, message);
export const forbidden = (code = "FORBIDDEN", message = "Không có quyền") => new AppError(HttpStatus.FORBIDDEN, code, message);
export const unauthorized = (code = "UNAUTHORIZED", message = "Chưa xác thực") => new AppError(HttpStatus.UNAUTHORIZED, code, message);
export const badRequest = (code: string, message: string, details?: unknown) =>
  new AppError(HttpStatus.BAD_REQUEST, code, message, details);
export const conflict = (code: string, message: string) => new AppError(HttpStatus.CONFLICT, code, message);
