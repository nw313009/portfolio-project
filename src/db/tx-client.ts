import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import { getDatabaseUrl } from "@/db/env";
import * as schema from "@/db/schema";

neonConfig.webSocketConstructor = ws;

type TxDb = ReturnType<typeof drizzle<typeof schema>>;

let instance: TxDb | undefined;

/**
 * Pooled WebSocket driver, used only where a real multi-statement
 * transaction is needed (e.g. Slice 4: insert a project + its audit_log row
 * atomically). Node.js runtime only (route handlers, not middleware/edge).
 * Lazily constructed for the same reason as `client.ts`'s `db`: importing
 * this module must not require `DATABASE_URL` to already be set.
 */
function getTxDb(): TxDb {
  if (!instance) {
    const pool = new Pool({ connectionString: getDatabaseUrl() });
    instance = drizzle({ client: pool, schema });
  }
  return instance;
}

export const txDb: TxDb = new Proxy({} as TxDb, {
  get(_target, prop, receiver) {
    return Reflect.get(getTxDb(), prop, receiver);
  },
});
