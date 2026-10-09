import "server-only";
import { db } from "@/lib/db";

const WINDOW_MS = 15 * 60 * 1000;

/**
 * Failed attempts allowed inside the window. The tight limit is per account *and* IP
 * address, so someone guessing from elsewhere cannot easily lock the real owner out.
 * The wider limits stop guessing spread across many addresses or many accounts.
 */
const MAX_PER_EMAIL_AND_IP = 5;
const MAX_PER_EMAIL = 20;
const MAX_PER_IP = 20;

/** Attempts older than this are deleted the next time someone fails to sign in. */
const RETENTION_MS = 24 * 60 * 60 * 1000;

export const LOCKOUT_MINUTES = WINDOW_MS / 60_000;

export async function isLoginBlocked(email: string, ipHash: string | null): Promise<boolean> {
  const recent = { createdAt: { gte: new Date(Date.now() - WINDOW_MS) } };
  const [fromHere, forAccount, fromAddress] = await Promise.all([
    db().loginAttempt.count({ where: { ...recent, email, ipHash } }),
    db().loginAttempt.count({ where: { ...recent, email } }),
    ipHash ? db().loginAttempt.count({ where: { ...recent, ipHash } }) : 0,
  ]);
  return (
    fromHere >= MAX_PER_EMAIL_AND_IP || forAccount >= MAX_PER_EMAIL || fromAddress >= MAX_PER_IP
  );
}

export async function recordFailedLogin(email: string, ipHash: string | null): Promise<void> {
  await db().$transaction([
    db().loginAttempt.create({ data: { email, ipHash } }),
    db().loginAttempt.deleteMany({
      where: { createdAt: { lt: new Date(Date.now() - RETENTION_MS) } },
    }),
  ]);
}

/** A successful sign-in clears that device's failed attempts for the account. */
export async function clearFailedLogins(email: string, ipHash: string | null): Promise<void> {
  await db().loginAttempt.deleteMany({ where: { email, ipHash } });
}
