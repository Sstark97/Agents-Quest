import { randomBytes } from "node:crypto";
import type { RandomSource } from "../../application/server/ports";

export const nodeRandom: RandomSource = {
  bytes: (length) => randomBytes(length),
  hex: (byteLength) => randomBytes(byteLength).toString("hex"),
};
