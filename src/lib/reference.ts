import "server-only";
import { randomInt } from "node:crypto";
import { makeReference } from "./reference-format";

/** Customer-facing quote reference such as "BR-7K3Q9F". */
export function generateReference(): string {
  return makeReference((max) => randomInt(max));
}
