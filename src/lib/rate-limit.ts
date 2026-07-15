import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Per-IP rate limiting for the public event beacon, backed by Upstash Redis
 * (NOT Postgres — a rate-limit check must never touch the events DB). The IP is
 * the limiter key and is used transiently only; it is never stored.
 *
 * `Redis.fromEnv()` reads the already-provisioned `UPSTASH_REDIS_REST_URL` and
 * `UPSTASH_REDIS_REST_TOKEN` (consumed verbatim; no new env vars). The limiter
 * is built lazily on first use — like `src/db/client.ts` — so importing this
 * module (e.g. under test) never requires the env to be set; only an actual
 * `.limit()` call constructs the client.
 */

/** Sliding window: this many event beacons per IP per window. */
const LIMIT = 30;
const WINDOW = "10 s" as const;

let instance: Ratelimit | undefined;

function getRateLimiter(): Ratelimit {
  if (!instance) {
    instance = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(LIMIT, WINDOW),
      prefix: "ratelimit:events",
    });
  }
  return instance;
}

/**
 * Returns whether an event from `ip` is within the rate limit.
 *
 * FAIL-OPEN by design: if Upstash is unreachable or misconfigured, we allow the
 * event rather than dropping legitimate metrics — the endpoint is a
 * fire-and-forget beacon that never affects the visitor UI either way, and
 * losing analytics to an infra blip is worse than briefly relaxing the cap. The
 * error is logged for observability.
 */
export async function checkEventRateLimit(
  ip: string,
): Promise<{ success: boolean }> {
  try {
    const { success } = await getRateLimiter().limit(ip);
    return { success };
  } catch (error) {
    console.error("[events] rate limit check failed; allowing (fail-open)", error);
    return { success: true };
  }
}
