import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { siteUrl } from "@/config/site";
import { getSiteContent } from "@/features/content/data";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { RESET_PASSWORD_PATH } from "./cookie";
import { passwordResetEmail } from "./emails";

/** How long an emailed link works. */
export const RESET_LINK_MINUTES = 30;

/** Links one account may have open at once, so the form cannot be used to flood an inbox. */
const MAX_OPEN_LINKS = 3;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Emails a reset link to the active account with this address, if there is one, and does
 * nothing otherwise. Runs after the response is sent, so neither the reply nor its timing
 * tells the visitor whether the account exists. Never throws.
 */
export async function sendPasswordResetLink(email: string): Promise<void> {
  try {
    const user = await db().adminUser.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, disabledAt: true },
    });
    if (!user || user.disabledAt) return;

    const now = new Date();
    const open = await db().passwordResetToken.count({
      where: { userId: user.id, expiresAt: { gt: now } },
    });
    if (open >= MAX_OPEN_LINKS) {
      console.warn(`[auth] Reset link for ${email} not sent: ${open} links are already open.`);
      return;
    }

    const token = randomBytes(32).toString("base64url");
    await db().$transaction([
      db().passwordResetToken.deleteMany({ where: { expiresAt: { lte: now } } }),
      db().passwordResetToken.create({
        data: {
          tokenHash: hashToken(token),
          userId: user.id,
          expiresAt: new Date(now.getTime() + RESET_LINK_MINUTES * 60_000),
        },
      }),
    ]);

    const url = `${siteUrl}${RESET_PASSWORD_PATH}?token=${token}`;
    const { business } = await getSiteContent();
    const outcome = await sendEmail({
      to: user.email,
      ...passwordResetEmail({
        brand: business.name,
        name: user.name,
        email: user.email,
        url,
        validMinutes: RESET_LINK_MINUTES,
      }),
    });

    if (outcome.status === "failed") {
      console.error(`[email] Reset link to ${email} failed: ${outcome.reason}`);
    } else if (outcome.status === "skipped" && process.env.NODE_ENV !== "production") {
      // Email is not set up locally, so print the link to let the flow be tried anyway.
      console.info(`[auth] Reset link for ${email}: ${url}`);
    }
  } catch (error) {
    console.error("[auth] Could not send a password reset link", error);
  }
}

/** The active account a reset link belongs to, or null if the link is unknown, used or expired. */
export async function findResetAccount(token: string): Promise<{ id: string; email: string } | null> {
  // Real tokens are 43 characters; anything far off is not worth a database lookup.
  if (!token || token.length > 100) return null;

  const link = await db().passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { expiresAt: true, user: { select: { id: true, email: true, disabledAt: true } } },
  });
  if (!link || link.expiresAt.getTime() <= Date.now() || link.user.disabledAt) return null;
  return { id: link.user.id, email: link.user.email };
}

/**
 * Sets the account's new password from a reset link. The link stops working, and so do the
 * account's other open links and its sign-ins on every device. False if the link was used or
 * expired in the meantime.
 */
export async function redeemPasswordReset(
  token: string,
  userId: string,
  passwordHash: string,
): Promise<boolean> {
  // Deleting the link claims it: if it is submitted twice at once, only one delete finds it.
  const { count } = await db().passwordResetToken.deleteMany({
    where: { tokenHash: hashToken(token), userId, expiresAt: { gt: new Date() } },
  });
  if (count === 0) return false;

  await db().$transaction([
    db().adminUser.update({ where: { id: userId }, data: { passwordHash } }),
    db().passwordResetToken.deleteMany({ where: { userId } }),
    db().session.deleteMany({ where: { userId } }),
  ]);
  return true;
}
