import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_HOME, LOGIN_PATH, SESSION_COOKIE } from "@/features/auth/cookie";

/**
 * Sends visitors without a session cookie to the sign-in page before any admin page
 * renders. This is only a fast first check: every admin page, action and export
 * verifies the session against the database itself.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname === LOGIN_PATH || request.cookies.has(SESSION_COOKIE)) {
    return NextResponse.next();
  }

  const login = new URL(LOGIN_PATH, request.url);
  if (pathname !== ADMIN_HOME) login.searchParams.set("next", pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/admin/:path*"],
};
