// Kept free of server-only imports so the proxy can read the cookie name too.

const isProduction = process.env.NODE_ENV === "production";

/** How long a sign-in lasts before the team member has to sign in again. */
export const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000;

/** The "__Host-" prefix makes browsers refuse the cookie unless it is Secure and host-only. */
export const SESSION_COOKIE = isProduction ? "__Host-br_session" : "br_session";

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax",
  path: "/",
} as const;

export const LOGIN_PATH = "/desk/login";
/** Asks for a password reset link by email. */
export const FORGOT_PASSWORD_PATH = "/desk/forgot-password";
/** Where the emailed link lands, with the token in `?token=`. */
export const RESET_PASSWORD_PATH = "/desk/reset-password";
/** Panel pages that work without signing in. */
export const SIGNED_OUT_PATHS: readonly string[] = [LOGIN_PATH, FORGOT_PASSWORD_PATH, RESET_PASSWORD_PATH];
/** Where the panel lives: src/app/desk. */
export const PANEL_HOME = "/desk";
