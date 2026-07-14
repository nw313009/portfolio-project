import { NextResponse } from "next/server";
import { checkAdminAccess } from "@/lib/auth/require-admin";

/**
 * Minimal protected WRITE stub (Slice 4 replaces this with real project
 * ingestion). It exists now purely so the authZ boundary on a write route is
 * testable: it re-runs `auth()` + the allowlist server-side via
 * `checkAdminAccess()` and denies with 401/403 independently of middleware —
 * the middleware gate is optimistic and bypassable, this is authoritative.
 */
export async function POST() {
  const access = await checkAdminAccess();
  if (!access.ok) {
    return NextResponse.json(
      { error: access.reason },
      { status: access.reason === "unauthenticated" ? 401 : 403 },
    );
  }

  return NextResponse.json({ ok: true, email: access.session.user?.email });
}
