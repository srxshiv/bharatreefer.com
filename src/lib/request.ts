import "server-only";
import { createHmac } from "node:crypto";
import { serverEnv } from "@/lib/env";

/** Best-effort client IP from the proxy headers set by the hosting platform. */
export function clientIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || null;
}

/** Keyed hash of an IP so repeat submitters can be recognised without storing the address. */
export function hashIp(ip: string): string {
  return createHmac("sha256", serverEnv().IP_HASH_SALT).update(ip).digest("hex");
}
