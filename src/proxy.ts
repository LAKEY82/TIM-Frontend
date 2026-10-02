import { NextResponse, type NextRequest } from "next/server";
import { AUTH_HINT_COOKIE } from "@/lib/auth-hint";
import { env } from "@/lib/env";

/**
 * Optimistic route protection. Visitors without the non-sensitive "signed in"
 * hint cookie are sent to /login before the app shell renders.
 *
 * This is NOT an authorization check: the hint carries no credentials. The
 * client-side <ProtectedRoute> verifies the session with the API, and the API
 * enforces every permission.
 */
export function proxy(request: NextRequest) {
  if (env.authDisabled || request.cookies.get(AUTH_HINT_COOKIE)?.value) return NextResponse.next();
  const url = request.nextUrl.clone();
  const next = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  url.pathname = "/login";
  url.search = next && next !== "/" ? `?next=${encodeURIComponent(next)}` : "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/my-day/:path*",
    "/tasks/:path*",
    "/daily-tasks/:path*",
    "/projects/:path*",
    "/calendar/:path*",
    "/timeline/:path*",
    "/teams/:path*",
    "/team/:path*",
    "/clients/:path*",
    "/analytics/:path*",
    "/notifications/:path*",
    "/settings/:path*",
  ],
};
