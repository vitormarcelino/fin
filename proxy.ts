import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, SESSION_DURATION_MS } from "@/lib/auth/cookies";

const PUBLIC_ROUTES = new Set(["/login"]);

// Optimistic-only check: presence of the session cookie. The real
// validity check (does this token map to a non-expired session?) always
// happens server-side via requireSession()/getSession() in the DAL —
// this never trusts the cookie's mere presence for anything sensitive.
//
// Deliberately does NOT redirect /login away just because a cookie is
// present: a stale/invalid cookie (session deleted or expired server-side)
// would otherwise bounce forever — requireSession() sends the protected
// route to /login, and this would send /login straight back. The
// authoritative "already logged in, skip /login" redirect lives in the
// login page itself (a real DB check via getSession()), not here.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSessionCookie = request.cookies.has(SESSION_COOKIE_NAME);
  const isPublicRoute = PUBLIC_ROUTES.has(pathname);

  if (!hasSessionCookie && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const response = NextResponse.next();

  if (hasSessionCookie) {
    // Slide the browser-side cookie lifetime forward on activity. The
    // database session's own expiry (the real security boundary) is
    // extended independently by getSession() when it's close to expiring.
    const token = request.cookies.get(SESSION_COOKIE_NAME)!.value;
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(Date.now() + SESSION_DURATION_MS),
    });
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Run on everything except:
     * - _next/static, _next/image (build assets)
     * - manifest.webmanifest, sw.js, icons (PWA assets)
     * - favicon.ico
     * - /offline (must stay reachable without a session while offline)
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons|offline).*)",
  ],
};
