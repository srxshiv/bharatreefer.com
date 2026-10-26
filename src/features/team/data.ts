import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { Role } from "@/features/auth/roles";
import { ADMIN_DATA_TAG, ADMIN_PAGE_CACHE, requireAdmin } from "@/features/auth/session";
import { db } from "@/lib/db";
import { choosePromoCode } from "./promo-code";

/** An account as the Team page lists it. */
export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: Role;
  promoCode: string;
  /** When an admin switched the account off. Null while it can sign in. */
  disabledAt: Date | null;
  createdAt: Date;
  /** Requests credited to their promo code, spam left out. */
  brought: number;
  /** Of those, the ones the customer went ahead with (confirmed or completed). */
  won: number;
};

/** Every account, the ones that can sign in first. Admins only. */
export async function listTeam(): Promise<TeamMember[]> {
  "use cache: private";
  cacheLife(ADMIN_PAGE_CACHE);
  cacheTag(ADMIN_DATA_TAG);
  const [, members, credited] = await Promise.all([
    requireAdmin(),
    db().adminUser.findMany({
      orderBy: [{ disabledAt: { sort: "asc", nulls: "first" } }, { name: "asc" }],
      select: { id: true, name: true, email: true, role: true, promoCode: true, disabledAt: true, createdAt: true },
    }),
    db().quoteRequest.groupBy({
      by: ["referrerId", "status"],
      where: { referrerId: { not: null }, status: { not: "SPAM" } },
      _count: { _all: true },
    }),
  ]);

  return members.map((member) => {
    const rows = credited.filter((row) => row.referrerId === member.id);
    return {
      ...member,
      brought: rows.reduce((sum, row) => sum + row._count._all, 0),
      won: rows
        .filter((row) => row.status === "CONFIRMED" || row.status === "COMPLETED")
        .reduce((sum, row) => sum + row._count._all, 0),
    };
  });
}

/** Which of these codes already belong to an account. */
export async function promoCodesInUse(codes: string[]): Promise<string[]> {
  const rows = await db().adminUser.findMany({ where: { promoCode: { in: codes } }, select: { promoCode: true } });
  return rows.map((row) => row.promoCode);
}

/** A free promo code for a new account, made from its name where possible. */
export function freePromoCode(name: string, email: string): Promise<string> {
  return choosePromoCode(name, email, promoCodesInUse);
}
