"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db, describeDatabase } from "@/lib/db";
import { serverEnv } from "@/lib/env";
import { hashPassword, verifyPassword } from "@/lib/password";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/lib/password-policy";
import { clientIp, hashIp } from "@/lib/request";
import { ADMIN_HOME, LOGIN_PATH } from "./cookie";
import { createSession, destroyAllSessions, destroySession, requireAdmin } from "./session";
import {
  LOCKOUT_MINUTES,
  clearFailedLogins,
  isLoginBlocked,
  recordFailedLogin,
} from "./throttle";

export type AuthFormState = {
  error?: string;
  success?: string;
  /** The email that was submitted, so the sign-in form can keep it after a failed attempt. */
  email?: string;
};

const INVALID_CREDENTIALS = "Incorrect email or password.";

// Verified against when the email is unknown, so a missing account takes as long to
// reject as a wrong password and the response time does not reveal which emails exist.
let decoyHash: Promise<string> | undefined;

/** Where to land after signing in: the admin page the visitor was sent away from, if any. */
function destinationFrom(referer: string | null): string {
  if (!referer) return ADMIN_HOME;
  try {
    const next = new URL(referer).searchParams.get("next");
    const isAdminPath = next?.startsWith(`${ADMIN_HOME}/`) && !next.startsWith(LOGIN_PATH);
    return next && isAdminPath ? next : ADMIN_HOME;
  } catch {
    return ADMIN_HOME;
  }
}

export async function login(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) return { error: "Enter your email and password.", email };
  if (email.length > 254 || password.length > PASSWORD_MAX_LENGTH) {
    return { error: INVALID_CREDENTIALS };
  }

  const requestHeaders = await headers();
  const ip = clientIp(requestHeaders);
  const ipHash = ip ? hashIp(ip) : null;

  if (await isLoginBlocked(email, ipHash)) {
    return { error: `Too many attempts. Try again in ${LOCKOUT_MINUTES} minutes.`, email };
  }

  const user = await db().adminUser.findUnique({
    where: { email },
    select: { id: true, passwordHash: true },
  });
  decoyHash ??= hashPassword(crypto.randomUUID());
  const passwordMatches = await verifyPassword(password, user?.passwordHash ?? (await decoyHash));

  if (!user || !passwordMatches) {
    await recordFailedLogin(email, ipHash);
    // The visitor only ever sees the generic message. In development, say which part failed
    // and where, so a missing account or the wrong database is obvious from the terminal.
    if (process.env.NODE_ENV !== "production") {
      const where = describeDatabase(serverEnv().DATABASE_URL);
      console.warn(
        user
          ? `[auth] Wrong password for ${email} (database ${where}).`
          : `[auth] No admin account ${email} in database ${where}. Create it with: pnpm admin:create --email ${email} --name "Your Name"`,
      );
    }
    return { error: INVALID_CREDENTIALS, email };
  }

  await clearFailedLogins(email, ipHash);
  await createSession(user.id);
  redirect(destinationFrom(requestHeaders.get("referer")));
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect(LOGIN_PATH);
}

export async function changePassword(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const admin = await requireAdmin();

  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("newPassword") ?? "");
  const confirmation = String(formData.get("confirmPassword") ?? "");

  if (!current || !next) return { error: "Fill in every field." };
  if (next.length < PASSWORD_MIN_LENGTH) {
    return { error: `Use at least ${PASSWORD_MIN_LENGTH} characters for the new password.` };
  }
  if (next.length > PASSWORD_MAX_LENGTH || current.length > PASSWORD_MAX_LENGTH) {
    return { error: `Keep passwords under ${PASSWORD_MAX_LENGTH} characters.` };
  }
  if (next !== confirmation) return { error: "The new passwords do not match." };
  if (next === current) return { error: "Choose a password you have not just used." };

  const user = await db().adminUser.findUnique({
    where: { id: admin.id },
    select: { passwordHash: true },
  });
  if (!user || !(await verifyPassword(current, user.passwordHash))) {
    return { error: "Your current password is incorrect." };
  }

  await db().adminUser.update({
    where: { id: admin.id },
    data: { passwordHash: await hashPassword(next) },
  });
  await destroyAllSessions(admin.id, true);

  return { success: "Password changed. Other devices have been signed out." };
}
