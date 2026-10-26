import { NextResponse, type NextRequest } from "next/server";
import { LOGIN_PATH, PANEL_HOME, SESSION_COOKIE, SIGNED_OUT_PATHS } from "@/features/auth/cookie";

/**
 * Sends visitors without a session cookie to the sign-in page before any panel page
 * renders. This is only a fast first check: every panel page, action and export
 * verifies the session against the database itself.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (SIGNED_OUT_PATHS.includes(pathname) || request.cookies.has(SESSION_COOKIE)) {
    return NextResponse.next();
  }

  const login = new URL(LOGIN_PATH, request.url);
  if (pathname !== PANEL_HOME) login.searchParams.set("next", pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/desk/:path*"],
};
