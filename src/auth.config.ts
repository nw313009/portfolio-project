import GitHub from "next-auth/providers/github";
import type { NextAuthConfig } from "next-auth";
import { isAdmin } from "@/lib/auth/is-admin";

/**
 * Edge-safe Auth.js configuration (authN).
 *
 * Contains ONLY the parts that must run in the Edge runtime (providers +
 * callbacks) and imports NOTHING Node-only or DB-bound, so it can be shared by
 * both the root `auth.ts` instance and `middleware.ts`. There is deliberately no
 * database adapter — sessions are JWT-only (see `auth.ts`), matching a schema
 * with no users/accounts/sessions tables and keeping middleware edge-safe.
 *
 * GitHub can return a `null` email for accounts with a private email, so we
 * request the `user:email` scope and resolve the primary VERIFIED email via the
 * GitHub `/user/emails` API on first sign-in. That verified email is what the
 * `ADMIN_EMAILS` allowlist (authZ) is compared against — never a null email.
 */

interface GitHubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
}

/**
 * Fetch the account's primary, VERIFIED email from GitHub. Uses the OAuth access
 * token (only available on first sign-in). Returns null if none is verified.
 */
async function resolvePrimaryVerifiedEmail(
  accessToken: string,
): Promise<string | null> {
  try {
    const res = await fetch("https://api.github.com/user/emails", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "projects-homepage",
      },
    });
    if (!res.ok) return null;
    const emails = (await res.json()) as GitHubEmail[];
    if (!Array.isArray(emails)) return null;
    const primaryVerified = emails.find((e) => e.primary && e.verified);
    if (primaryVerified) return primaryVerified.email;
    const anyVerified = emails.find((e) => e.verified);
    return anyVerified?.email ?? null;
  } catch {
    return null;
  }
}

export const authConfig = {
  // Auth.js auto-detects a trusted host on Vercel (prod), but NOT under local
  // `next dev`/`next start`. Without this, both the middleware instance and the
  // root instance throw `UntrustedHost`, breaking local sign-in (the
  // developer's lock-out verification) and the E2E gate. A plain boolean —
  // edge-safe — and shared by both consumers via this config. Safe for a
  // single-domain deployment where the platform sets the host header.
  trustHost: true,
  providers: [
    GitHub({
      authorization: { params: { scope: "read:user user:email" } },
    }),
  ],
  callbacks: {
    /**
     * authN only: any GitHub user may authenticate. Access (authZ) is decided
     * separately by the allowlist, so a non-admin can sign in but reach nothing
     * protected. Kept as an explicit hook to make the authN/authZ split obvious.
     */
    signIn({ account }) {
      return account?.provider === "github";
    },
    /**
     * Optimistic middleware gate ONLY (NOT the security boundary). The matcher
     * restricts this to protected routes, so we allow only allowlisted admins;
     * everyone else is redirected to sign in. The authoritative check runs again
     * at the resource layer (`require-admin.ts`).
     */
    authorized({ auth }) {
      return isAdmin(auth?.user?.email, process.env.ADMIN_EMAILS);
    },
    /**
     * On first sign-in, stamp the token with the primary VERIFIED email (so a
     * private GitHub email never leaves the session null) and a derived admin
     * flag. On later calls (including in middleware) `account` is undefined and
     * the token is reused as-is — no network call on the hot path.
     */
    async jwt({ token, account }) {
      if (account?.access_token) {
        const verifiedEmail = await resolvePrimaryVerifiedEmail(
          account.access_token,
        );
        if (verifiedEmail) token.email = verifiedEmail;
        token.isAdmin = isAdmin(token.email, process.env.ADMIN_EMAILS);
      }
      return token;
    },
    /** Expose the verified email + admin flag to server-side session reads. */
    session({ session, token }) {
      if (session.user) {
        if (token.email) session.user.email = token.email;
        session.user.isAdmin = Boolean(token.isAdmin);
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
