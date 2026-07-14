/**
 * authZ (authorization) — deliberately decoupled from authN (GitHub OAuth).
 *
 * A pure function over an email and the raw `ADMIN_EMAILS` allowlist string so
 * it can be unit-tested in isolation and reused by both the optimistic
 * middleware gate and the authoritative resource-layer guard. It knows nothing
 * about GitHub, sessions, or tokens — only "is this verified email allowed?".
 */

/** Parse the comma-separated `ADMIN_EMAILS` allowlist into normalized entries. */
export function parseAdminEmails(adminEmails: string | undefined | null): string[] {
  if (!adminEmails) return [];
  return adminEmails
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);
}

/**
 * True only when `email` is a non-empty verified email present in the allowlist.
 * Comparison is trimmed and case-insensitive; a null/empty email is never admin.
 */
export function isAdmin(
  email: string | undefined | null,
  adminEmails: string | undefined | null,
): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  if (normalized.length === 0) return false;
  return parseAdminEmails(adminEmails).includes(normalized);
}
