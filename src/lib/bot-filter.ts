/**
 * Server-side bot/crawler filtering and transient client-IP extraction for the
 * public event beacon. Events from obvious bots are dropped BEFORE any write —
 * we record real, passive human engagement only, not crawler traffic.
 */

/**
 * User-Agent substrings that mark a request as automated. Matched
 * case-insensitively against the raw UA. This is a heuristic (UA is
 * spoofable), deliberately catching the common, honest crawlers and tools
 * rather than trying to defeat a determined adversary — the rate limiter is the
 * backstop for abuse.
 */
const BOT_UA_PATTERNS = [
  "bot",
  "crawl",
  "spider",
  "slurp",
  "curl",
  "wget",
  "python-requests",
  "httpclient",
  "headless",
  "phantomjs",
  "puppeteer",
  "playwright",
  "lighthouse",
  "pingdom",
  "uptimerobot",
  "facebookexternalhit",
  "embedly",
  "preview",
  "scraper",
  "http-client",
  "axios",
  "node-fetch",
  "go-http-client",
] as const;

/**
 * True when the request should be treated as an automated agent and its event
 * dropped. A MISSING or empty User-Agent is treated as a bot: a real browser
 * always sends one, so its absence is a strong automation signal.
 */
export function isBot(userAgent: string | null | undefined): boolean {
  if (!userAgent) return true;
  const ua = userAgent.toLowerCase();
  return BOT_UA_PATTERNS.some((pattern) => ua.includes(pattern));
}

/**
 * Extract the client IP from proxy headers for rate-limiting ONLY. The IP is
 * used transiently as the limiter key and is NEVER stored. `x-forwarded-for`
 * may be a comma-separated list (client, proxy1, proxy2, ...); the first hop is
 * the original client. Falls back to `x-real-ip`, then a constant so the
 * limiter still functions (all unknown-IP requests share one bucket) rather
 * than throwing.
 */
export function clientIpFrom(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}
