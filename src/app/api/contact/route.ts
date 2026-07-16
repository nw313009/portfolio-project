import { NextResponse } from "next/server";
import {
  contactPayloadSchema,
  hasVisitorContent,
} from "@/lib/contact-schema";
import { clientIpFrom, isBot } from "@/lib/bot-filter";
import { checkContactRateLimit } from "@/lib/rate-limit";
import { sendVisitorEmail } from "@/lib/contact-email";

/**
 * PUBLIC, UNAUTHENTICATED write for the OPTIONAL "who's visiting" card
 * (Slice 6). Its abuse target is the admin's INBOX, so the body is treated as
 * hostile input. This route is deliberately NOT in the middleware matcher
 * (positive allowlist: `/admin` + `/api/admin`), so it stays public; the public
 * timeline (`/`) stays `○ Static`/ISR because the card only POSTs here on a
 * deliberate submit, never during render.
 *
 * There is NO DB write on ANY path — the send IS the transaction (no row, no
 * retry, no audit). The submission is declared, consent-based identity and is
 * never correlated with the anonymous events stream.
 *
 * Pipeline (cheap → expensive; opaque wherever revealing the reason would help
 * an abuser):
 *   1. Bot User-Agent filter — opaque success + discard (never sent).
 *   2. Strict Zod parse — exact shape, hard length caps, unknown fields
 *      rejected (400). No client timestamp/id can be smuggled.
 *   3. Honeypot — a hidden field real users never fill. Populated ⇒ opaque
 *      success + discard; the catch is never revealed.
 *   4. At-least-one-field — an entirely empty submission is a 400 (the client
 *      guards this too).
 *   5. Per-IP rate limit (Upstash), MUCH tighter than the events beacon and
 *      FAIL-CLOSED — a limit (or limiter failure) yields the SAME opaque
 *      success + discard, so a spammer never learns what tripped. The IP is a
 *      transient limiter key only: never stored, never emailed.
 *   6. Send via Resend with every field HTML-escaped in the body. An honest
 *      failure is surfaced to the visitor (502) rather than a fake success.
 */

// The Resend send runs server-side; keep it off the edge for parity with the
// rest of the API surface (no edge-specific benefit here).
export const runtime = "nodejs";

/** Opaque, interchangeable "we're done" response for success AND silent-discard paths. */
const ok = () => NextResponse.json({ ok: true });

export async function POST(request: Request): Promise<NextResponse> {
  // 1. Drop obvious bots BEFORE any work — opaquely (a bot gets the same 200).
  if (isBot(request.headers.get("user-agent"))) {
    return ok();
  }

  // 2. Strict validation. Malformed/non-JSON/over-length/unknown-field ⇒ 400.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const parsed = contactPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const data = parsed.data;

  // 3. Honeypot populated ⇒ silently accept + discard. Never reveal the catch.
  if (data.website && data.website.trim().length > 0) {
    return ok();
  }

  // 4. Reject an entirely empty submission (require at least one real field).
  if (!hasVisitorContent(data)) {
    return NextResponse.json({ error: "empty_submission" }, { status: 400 });
  }

  // 5. Tight per-IP rate limit (fail-closed). A limit is OPAQUE: same response
  //    as success, submission discarded. IP used transiently as the key only.
  const ip = clientIpFrom(request.headers);
  const { success: allowed } = await checkContactRateLimit(ip);
  if (!allowed) {
    return ok();
  }

  // 6. Send. The honeypot is intentionally excluded from what we email.
  const { ok: sent } = await sendVisitorEmail({
    name: data.name,
    company: data.company,
    position: data.position,
    message: data.message,
  });
  if (!sent) {
    // Honest failure — do NOT fake success and silently lose the submission.
    return NextResponse.json({ error: "send_failed" }, { status: 502 });
  }

  return ok();
}
