import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { User } from "@/features/auth/session";

/**
 * The requests a team member may see and work on. Admins see every request. Staff see the ones
 * credited to their promo code and the ones they entered themselves; anything else does not
 * exist for them. Every read and write of quote data applies this, in the query itself.
 */
export function visibleTo(user: Pick<User, "id" | "role">): Prisma.QuoteRequestWhereInput {
  return user.role === "ADMIN" ? {} : { OR: [{ referrerId: user.id }, { createdById: user.id }] };
}
