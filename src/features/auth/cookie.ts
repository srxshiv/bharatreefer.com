// Kept free of server-only imports so the proxy can read the cookie name too.

const isProduction = process.env.NODE_ENV === "production";

/** How long a sign-in lasts before the admin has to sign in again. */
export const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000;

/** The "__Host-" prefix makes browsers refuse the cookie unless it is Secure and host-only. */
export const SESSION_COOKIE = isProduction ? "__Host-br_session" : "br_session";

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax",
  path: "/",
} as const;

export const LOGIN_PATH = "/admin/login";
export const ADMIN_HOME = "/admin";
