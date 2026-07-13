import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { getDatabaseUrl } from "@/db/env";
import * as schema from "@/db/schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

let instance: Db | undefined;

/**
 * Lazily builds the HTTP driver client on first real use rather than at
 * module-import time. This lets test files import `@/db/queries` and skip
 * (via `describe.skipIf`) without `DATABASE_URL` set — the module graph
 * loads fine; only an actual query would throw `getDatabaseUrl`'s error.
 */
function getDb(): Db {
  if (!instance) {
    // `disableWarningInBrowsers` silences a false-positive warning: this
    // driver detects a `window` global (present under Vitest's jsdom test
    // environment) and assumes it's running client-side, which it never is
    // here — every caller of `@/db/client` is server-only.
    const sql = neon(getDatabaseUrl(), { disableWarningInBrowsers: true });
    instance = drizzle({ client: sql, schema });
  }
  return instance;
}

/**
 * HTTP driver: one request per query, no persistent connection. This is the
 * right driver for the public read hot path (ISR-rendered timeline, Slice 2)
 * and any other read that doesn't need a multi-statement transaction.
 */
export const db: Db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});
