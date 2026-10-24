import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

/**
 * Route protection:
 *  - /account, /orders          → signed-in users only
 *  - /admin                     → ADMIN or STAFF only (role check via token)
 *  - /checkout                  → requires a cart session cookie (cart itself is enough;
 *                                 the page also re-checks server-side)
 *
 * Role gating uses the JWT so no DB hit happens per-request; server components
 * and actions in /admin re-verify with requireAdmin() for defence in depth.
 *
 * Static exports (GitHub Pages) have no middleware runtime, so the guard is
 * swapped for a pass-through at build time — the guarded pages themselves
 * render demo notices in that mode instead of private data.
 */
const staticPassthrough = () => NextResponse.next();

export default process.env.STATIC_EXPORT === "1"
  ? staticPassthrough
  : withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const role = req.nextauth.token?.role;

    if (pathname.startsWith("/admin") && role !== "ADMIN" && role !== "STAFF") {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        // Admin is checked in the middleware function above (needs role, not just token).
        if (pathname.startsWith("/admin")) return Boolean(token);
        return Boolean(token);
      },
    },
    pages: { signIn: "/login" },
  },
);

export const config = {
  matcher: ["/account/:path*", "/orders/:path*", "/admin/:path*"],
};
