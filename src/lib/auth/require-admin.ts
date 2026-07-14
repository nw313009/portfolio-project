import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/auth/is-admin";

/**
 * AUTHORITATIVE authZ boundary (the real security check).
 *
 * Middleware is only an optimistic UX gate and is bypassable (CVE-2025-29927),
 * so every protected route handler / server action / admin server component must
 * re-run `auth()` + `isAdmin(ADMIN_EMAILS)` here, server-side, and deny even if
 * middleware never ran. This re-derives admin-ness from the current
 * `ADMIN_EMAILS` allowlist against the session's verified email — it does not
 * trust a stale flag baked into the token.
 */

export type AdminAccess =
  | { ok: true; session: Session }
  | { ok: false; reason: "unauthenticated" | "forbidden" };

/** Core check: resolves the session and re-evaluates the allowlist. */
export async function checkAdminAccess(): Promise<AdminAccess> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, reason: "unauthenticated" };
  }
  if (!isAdmin(session.user.email, process.env.ADMIN_EMAILS)) {
    return { ok: false, reason: "forbidden" };
  }
  return { ok: true, session };
}

/**
 * For admin Server Components: returns the session when allowed, otherwise
 * redirects (sign-in for unauthenticated, home for authenticated-but-forbidden).
 * `redirect()` throws, so control never falls through when access is denied.
 */
export async function requireAdmin(): Promise<Session> {
  const access = await checkAdminAccess();
  if (!access.ok) {
    redirect(access.reason === "unauthenticated" ? "/api/auth/signin" : "/");
  }
  return access.session;
}
