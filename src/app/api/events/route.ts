import { NextResponse } from "next/server";
import { eventPayloadSchema } from "@/lib/event-schema";
import { clientIpFrom, isBot } from "@/lib/bot-filter";
import { checkEventRateLimit } from "@/lib/rate-limit";
import { projectExists, recordEvent } from "@/db/queries";

/**
 * PUBLIC, UNAUTHENTICATED event beacon — the first unauthenticated write in the
 * system, so the body is treated as hostile input. This route is deliberately
 * NOT in the middleware matcher (positive allowlist: `/admin` + `/api/admin`),
 * so it stays public; the public timeline (`/`) stays static/ISR because events
 * are recorded here from a client `sendBeacon`, never during render.
 *
 * Pipeline (fail fast, cheap → expensive):
 *   1. Bot User-Agent filter — obvious crawlers/tools are dropped, not recorded.
 *   2. Per-IP rate limit (Upstash Redis) — IP used transiently, never stored.
 *   3. Strict Zod parse — exactly `{ projectId, type, sessionId }`, unknown
 *      fields rejected; the timestamp is NEVER client-supplied.
 *   4. Known-project check — a well-formed but unknown `projectId` is rejected
 *      (no FK on `events`; this is the archival-friendly equivalent).
 *   5. Write via the Pool writer with a server-derived `now()` timestamp.
 *
 * The client fires-and-forgets and ignores the response, so status codes exist
 * for correctness/tests, not for the visitor. Nothing here can block or degrade
 * rendering.
 */

// Needs the Node.js runtime: the write goes through the `neon-serverless` Pool
// (WebSocket/`ws`), which is not available on the edge runtime.
export const runtime = "nodejs";

/** Silent, body-less success/skip for the beacon. */
const noContent = () => new NextResponse(null, { status: 204 });

export async function POST(request: Request): Promise<NextResponse> {
  // 1. Drop obvious bots BEFORE any work — silently (a bot gets the same 204).
  if (isBot(request.headers.get("user-agent"))) {
    return noContent();
  }

  // 2. Rate limit per client IP (transient key, never persisted).
  const ip = clientIpFrom(request.headers);
  const { success } = await checkEventRateLimit(ip);
  if (!success) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  // 3. Strict validation. A malformed/oversized/non-JSON body is a 400.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = eventPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }
  const { projectId, type, sessionId } = parsed.data;

  // 4. Reject events for projects we don't know about.
  if (!(await projectExists(projectId))) {
    return NextResponse.json({ error: "unknown_project" }, { status: 400 });
  }

  // 5. Write with a server-side timestamp (the `ts` column default `now()`).
  await recordEvent({ projectId, type, sessionId });

  return noContent();
}
