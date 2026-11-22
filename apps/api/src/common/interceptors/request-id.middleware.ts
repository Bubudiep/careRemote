import { Logger } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";

const logger = new Logger("HTTP");

/** Gắn requestId và log ngắn gọn (không log body, header Authorization, cookie) */
export function requestIdMiddleware(req: Request & { requestId?: string }, res: Response, next: NextFunction) {
  const id = (req.headers["x-request-id"] as string) || randomUUID();
  req.requestId = id;
  res.setHeader("x-request-id", id);
  const start = Date.now();
  res.on("finish", () => {
    logger.log(`${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms [${id}]`);
  });
  next();
}
