import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

/**
 * OPTIMISTIC UX gate ONLY — NOT the security boundary.
 *
 * Middleware is bypassable (CVE-2025-29927), so this exists purely to bounce
 * obviously-unauthorized users away from protected routes early. It runs the
 * edge-safe `authConfig` (no DB/Node imports) and delegates the decision to its
 * `authorized` callback. The AUTHORITATIVE check is re-run server-side at every
 * protected resource (`require-admin.ts`).
 *
 * The matcher POSITIVELY lists only protected routes, which inherently excludes
 * `/`, static assets, and the auth API — the public timeline stays
 * unauthenticated + static/ISR, untouched.
 */
export const { auth: middleware } = NextAuth(authConfig);

export default middleware;

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
