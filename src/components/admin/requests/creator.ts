import { ROLE_LABELS } from "@/features/auth/roles";
import type { Creator, Referrer } from "@/features/quotes/admin";

/** "Priya Sharma (staff)" for a request a team member entered; null for one from the website. */
export function describeCreator(createdBy: Creator): string | null {
  return createdBy ? `${createdBy.name} (${ROLE_LABELS[createdBy.role].toLowerCase()})` : null;
}

/** "Priya Sharma (PRIYA)" for a request credited to a promo code; null for one without. */
export function describeReferrer(referrer: Referrer): string | null {
  return referrer ? `${referrer.name} (${referrer.promoCode})` : null;
}
