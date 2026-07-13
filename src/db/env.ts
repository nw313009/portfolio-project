/**
 * Server-only. Throws early (at import time, in the module that needs it)
 * rather than letting a route handler hit an undefined-connection-string
 * error deep inside the driver.
 */
export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Point it at a Neon branch (test/dev locally, prod on Vercel) in .env.local.",
    );
  }
  return url;
}
