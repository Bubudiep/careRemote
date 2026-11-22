import { PipeTransform } from "@nestjs/common";
import type { ZodTypeAny, z } from "zod";
import { badRequest } from "../errors";

export class ZodPipe<S extends ZodTypeAny> implements PipeTransform<unknown, z.infer<S>> {
  constructor(private readonly schema: S) {}
  transform(value: unknown): z.infer<S> {
    const r = this.schema.safeParse(value);
    if (!r.success) {
      throw badRequest(
        "VALIDATION_ERROR",
        "Dữ liệu không hợp lệ",
        r.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      );
    }
    return r.data;
  }
}

export const zod = <S extends ZodTypeAny>(schema: S) => new ZodPipe(schema);
