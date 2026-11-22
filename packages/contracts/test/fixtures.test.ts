import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { EnvelopeSchema, InjectEventSchema } from "../src";

const dir = join(__dirname, "..", "fixtures", "bridge");

describe("bridge fixtures", () => {
  for (const file of readdirSync(dir)) {
    it(`${file} khớp schema`, () => {
      const json = JSON.parse(readFileSync(join(dir, file), "utf8"));
      expect(EnvelopeSchema.safeParse(json).success).toBe(true);
      const r = InjectEventSchema.safeParse(json);
      if (!r.success) console.error(r.error.issues);
      expect(r.success).toBe(true);
    });
  }
});
