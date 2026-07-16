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

/**
 * MUCH TIGHTER per-IP limit for the "who's visiting" contact card (Slice 6):
 * this is a once-per-visitor action, not a per-scroll beacon, and its abuse
 * target is the admin's INBOX. A handful of submissions per IP per hour covers
 * a genuine retry/typo without opening an email-bomb vector.
 */
const CONTACT_LIMIT = 3;
const CONTACT_WINDOW = "1 h" as const;

let contactInstance: Ratelimit | undefined;

function getContactRateLimiter(): Ratelimit {
  if (!contactInstance) {
    contactInstance = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(CONTACT_LIMIT, CONTACT_WINDOW),
      prefix: "ratelimit:contact",
    });
  }
  return contactInstance;
}

/**
 * Returns whether a contact submission from `ip` is within the rate limit.
 *
 * FAIL-CLOSED by design — the OPPOSITE of the events beacon. Because the abuse
 * target is the admin's inbox, if Upstash is unreachable we deny rather than
 * allow: silently dropping a rare legitimate submission during an infra blip is
 * strictly safer than leaving the inbox unprotected. The caller treats a denial
 * OPAQUELY (same response as success — see the route), so this never reveals to
 * a spammer that (or why) they were throttled.
 */
export async function checkContactRateLimit(
  ip: string,
): Promise<{ success: boolean }> {
  try {
    const { success } = await getContactRateLimiter().limit(ip);
    return { success };
  } catch (error) {
    console.error("[contact] rate limit check failed; denying (fail-closed)", error);
    return { success: false };
  }
}
