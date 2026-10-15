import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cacheLife } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { LOGIN_PATH, SESSION_COOKIE, SESSION_COOKIE_OPTIONS, SESSION_TTL_MS } from "./cookie";

/** The signed-in admin, trimmed to what the UI needs. */
export type Admin = {
  id: string;
  name: string;
  email: string;
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Signs the admin in: stores a session and sets its cookie. Call from a Server Action. */
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
 * The signed-in admin, or null. Checked against the database on every request, so a
 * session that was signed out or expired stops working immediately.
 *
 * Cached privately: the result is never stored on the server, only kept by this browser
 * with the pages that used it. That is what lets the admin pages be prefetched whole, data
 * included, so switching between them is instant.
 */
export async function getAdmin(): Promise<Admin | null> {
  "use cache: private";
  cacheLife(ADMIN_PAGE_CACHE);

  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db().session.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { expiresAt: true, user: { select: { id: true, name: true, email: true } } },
  });
  if (!session || session.expiresAt.getTime() <= Date.now()) return null;

  return session.user;
}

/** The signed-in admin. Sends anyone else to the sign-in page. */
export async function requireAdmin(): Promise<Admin> {
  const admin = await getAdmin();
  if (!admin) redirect(LOGIN_PATH);
  return admin;
}

/** Signs out the current browser. Call from a Server Action. */
export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await db().session.deleteMany({ where: { tokenHash: hashToken(token) } });
  // Overwritten rather than deleted: a "__Host-" cookie is only accepted with the Secure flag.
  store.set(SESSION_COOKIE, "", { ...SESSION_COOKIE_OPTIONS, maxAge: 0 });
}

/** Signs an admin out everywhere, optionally keeping the current browser signed in. */
export async function destroyAllSessions(userId: string, keepCurrent = false): Promise<void> {
  const token = keepCurrent ? (await cookies()).get(SESSION_COOKIE)?.value : undefined;
  await db().session.deleteMany({
    where: { userId, ...(token ? { tokenHash: { not: hashToken(token) } } : {}) },
  });
}
