import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cacheLife } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { LOGIN_PATH, PANEL_HOME, SESSION_COOKIE, SESSION_COOKIE_OPTIONS, SESSION_TTL_MS } from "./cookie";
import type { Role } from "./roles";

/** The signed-in team member, trimmed to what the UI needs. */
export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  /** What customers enter on the quote form to credit a request to this team member. */
  promoCode: string;
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Signs a team member in: stores a session and sets its cookie. Call from a Server Action. */
export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db().session.create({ data: { tokenHash: hashToken(token), userId, expiresAt } });
  (await cookies()).set(SESSION_COOKIE, token, { ...SESSION_COOKIE_OPTIONS, expires: expiresAt });
}

/**
 * How long a browser may reuse admin pages it already has (or prefetched) before asking the
 * server again. Any save clears them at once, so this only delays changes made elsewhere,
 * such as a new quote request arriving. 30 seconds is the shortest Next.js allows for
 * prefetched pages to stay usable.
 */
export const ADMIN_PAGE_CACHE = { stale: 30, revalidate: 300, expire: 3600 } as const;

/**
 * Tag on every privately cached admin read. Admin saves expire it with `updateTag`, so the
 * page they refresh shows the change instead of the cached data from before it.
 */
export const ADMIN_DATA_TAG = "admin-data";

/**
 * The signed-in team member, or null. Checked against the database on every request, so a
 * session that was signed out or expired, or an account that was switched off, stops working
 * immediately, and a change of role applies to the next page.
 *
 * Cached privately: the result is never stored on the server, only kept by this browser
 * with the pages that used it. That is what lets the panel's pages be prefetched whole, data
 * included, so switching between them is instant.
 */
export async function getUser(): Promise<User | null> {
  "use cache: private";
  cacheLife(ADMIN_PAGE_CACHE);

  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db().session.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      expiresAt: true,
      user: { select: { id: true, name: true, email: true, role: true, promoCode: true, disabledAt: true } },
    },
  });
  if (!session || session.expiresAt.getTime() <= Date.now() || session.user.disabledAt) return null;

  const { id, name, email, role, promoCode } = session.user;
  return { id, name, email, role, promoCode };
}

/** The signed-in team member, admin or staff. Sends anyone else to the sign-in page. */
export async function requireUser(): Promise<User> {
  const user = await getUser();
  if (!user) redirect(LOGIN_PATH);
  return user;
}

/**
 * The signed-in admin. Staff are sent to the requests page (the panel does not link them to
 * admin pages, so only a typed or stale address lands here); anyone signed out goes to sign in.
 */
export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect(PANEL_HOME);
  return user;
}

/** Signs out the current browser. Call from a Server Action. */
export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await db().session.deleteMany({ where: { tokenHash: hashToken(token) } });
  // Overwritten rather than deleted: a "__Host-" cookie is only accepted with the Secure flag.
  store.set(SESSION_COOKIE, "", { ...SESSION_COOKIE_OPTIONS, maxAge: 0 });
}

/** Signs a team member out everywhere, optionally keeping the current browser signed in. */
export async function destroyAllSessions(userId: string, keepCurrent = false): Promise<void> {
  const token = keepCurrent ? (await cookies()).get(SESSION_COOKIE)?.value : undefined;
  await db().session.deleteMany({
    where: { userId, ...(token ? { tokenHash: { not: hashToken(token) } } : {}) },
  });
}
