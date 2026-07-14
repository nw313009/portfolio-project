import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

/**
 * Root Auth.js instance. Adds the JWT session strategy (no database adapter —
 * single-admin allowlist, edge-safe middleware) on top of the shared edge-safe
 * `authConfig`, and exports the server-side primitives used across the app.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
});
