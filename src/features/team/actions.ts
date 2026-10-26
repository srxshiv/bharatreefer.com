"use server";

import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { refreshAdminData } from "@/features/auth/refresh-admin";
import { ROLES, ROLE_LABELS, isRole } from "@/features/auth/roles";
import { requireAdmin } from "@/features/auth/session";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/lib/password-policy";
import { freePromoCode } from "./data";
import { isPromoCode, normalisePromoCode } from "./promo-code";

// Admins only. An admin cannot change their own role or switch off their own account, so
// whoever is managing the team always stays an admin and the panel always keeps one.

export type TeamFormState = {
  error?: string;
  success?: string;
};

/** Postgres unique-constraint violation, as reported by Prisma. */
const UNIQUE_VIOLATION = "P2002";
const GONE = "This account no longer exists.";

const password = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters for the password.`)
  .max(PASSWORD_MAX_LENGTH, `Keep the password under ${PASSWORD_MAX_LENGTH} characters.`);

const newMemberSchema = z.object({
  name: z.string().trim().min(2, "Enter their name.").max(80, "Keep the name under 80 characters."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254, "Keep the email under 254 characters.")
    .pipe(z.email("Enter a valid email address.")),
  role: z.enum(ROLES, { error: "Choose a role." }),
  password,
});

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function isAccountId(id: unknown): id is string {
  return typeof id === "string" && id.length > 0 && id.length <= 64;
}

/** Creates an account that can sign in straight away with the password the admin chose. */
export async function createTeamMember(formData: FormData): Promise<TeamFormState> {
  await requireAdmin();

  const parsed = newMemberSchema.safeParse({
    name: field(formData, "name"),
    email: field(formData, "email"),
    role: field(formData, "role"),
    password: field(formData, "password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { name, email, role } = parsed.data;
  const passwordHash = await hashPassword(parsed.data.password);
  // A clash is either the email (someone added them a moment ago) or the promo code (another
  // account took it in between). Checking the email again tells which; a code clash retries.
  for (let attempt = 1; ; attempt += 1) {
    if (await db().adminUser.findUnique({ where: { email }, select: { id: true } })) {
      return { error: `There is already an account for ${email}.` };
    }
    try {
      const { promoCode } = await db().adminUser.create({
        data: { name, email, role, passwordHash, promoCode: await freePromoCode(name, email) },
        select: { promoCode: true },
      });
      refreshAdminData();
      return {
        success: `${name} can sign in now as ${ROLE_LABELS[role].toLowerCase()}, with promo code ${promoCode}. Share the password with them privately.`,
      };
    } catch (error) {
      const clash = error instanceof Prisma.PrismaClientKnownRequestError && error.code === UNIQUE_VIOLATION;
      if (!clash || attempt >= 3) throw error;
    }
  }
}

/** Gives an account a promo code of the admin's choosing. Requests already credited stay credited. */
export async function setTeamMemberPromoCode(id: string, formData: FormData): Promise<TeamFormState> {
  await requireAdmin();
  if (!isAccountId(id)) return { error: GONE };
  const promoCode = normalisePromoCode(field(formData, "promoCode"));
  if (!isPromoCode(promoCode)) return { error: "Use 4 or 5 letters or digits, for example PRIYA." };

  const owner = await db().adminUser.findUnique({ where: { promoCode }, select: { id: true, name: true } });
  if (owner && owner.id !== id) return { error: `${promoCode} is ${owner.name}'s code. Choose another.` };
  if (owner) return { success: "Nothing to change." };

  try {
    const { count } = await db().adminUser.updateMany({ where: { id }, data: { promoCode } });
    if (count === 0) return { error: GONE };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === UNIQUE_VIOLATION) {
      return { error: `${promoCode} was just taken. Choose another.` };
    }
    throw error;
  }

  refreshAdminData();
  return { success: `Saved. Their code is ${promoCode} now; the old one no longer works.` };
}

export async function setTeamMemberRole(id: string, formData: FormData): Promise<TeamFormState> {
  const admin = await requireAdmin();
  if (!isAccountId(id)) return { error: GONE };
  const role = formData.get("role");
  if (!isRole(role)) return { error: "Choose a role." };
  if (id === admin.id) return { error: "You cannot change your own role. Ask another admin." };

  // The session check reads the role on every request, so the change applies at once.
  const { count } = await db().adminUser.updateMany({ where: { id }, data: { role } });
  if (count === 0) return { error: GONE };

  refreshAdminData();
  return { success: `Saved. They are ${role === "ADMIN" ? "an admin" : "staff"} now.` };
}

/** For a team member who forgot their password. Signs them out everywhere. */
export async function resetTeamMemberPassword(id: string, formData: FormData): Promise<TeamFormState> {
  const admin = await requireAdmin();
  if (!isAccountId(id)) return { error: GONE };
  if (id === admin.id) return { error: "Change your own password under Account." };

  const parsed = password.safeParse(field(formData, "password"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const passwordHash = await hashPassword(parsed.data);
  const [{ count }] = await db().$transaction([
    db().adminUser.updateMany({ where: { id }, data: { passwordHash } }),
    db().session.deleteMany({ where: { userId: id } }),
  ]);
  if (count === 0) return { error: GONE };

  refreshAdminData();
  return { success: "Password changed and they have been signed out. Share the new one privately." };
}

/**
 * Switches an account off, or back on. Switched off, it is signed out at once and cannot sign
 * in, but its name stays on the requests and notes it wrote. Accounts are never deleted.
 */
export async function setTeamMemberAccess(id: string, enabled: boolean): Promise<TeamFormState> {
  const admin = await requireAdmin();
  if (!isAccountId(id) || typeof enabled !== "boolean") return { error: GONE };
  if (id === admin.id) return { error: "You cannot switch off your own account." };

  const [{ count }] = await db().$transaction([
    db().adminUser.updateMany({ where: { id }, data: { disabledAt: enabled ? null : new Date() } }),
    ...(enabled ? [] : [db().session.deleteMany({ where: { userId: id } })]),
  ]);
  if (count === 0) return { error: GONE };

  refreshAdminData();
  return { success: enabled ? "Switched back on. They can sign in again." : "Switched off and signed out." };
}
