import type { EventType } from "@/lib/event-schema";

/**
 * Client-side, fire-and-forget engagement beacon. Every failure is swallowed:
 * recording an event must NEVER block, throw into, or degrade the visitor's
 * experience. Runs only in the browser (from effects/handlers), never during
 * SSR/prerender, so the public timeline stays static.
 */

/**
 * Ephemeral, in-MEMORY-ONLY, per-page-load correlation id. Generated lazily on
 * first use with `crypto.randomUUID()` and held in this module variable for the
 * life of the page. It is deliberately NOT persisted to any cookie,
 * `localStorage`, or `sessionStorage`, and is never derived from IP or a
 * fingerprint — it dies on refresh. It is a SESSION-scoped correlation id, NOT
 * a visitor id: it must never be joined to identity or labelled "unique
 * visitors" anywhere (the dashboard counts "sessions").
 */
let sessionId: string | undefined;

function getSessionId(): string | undefined {
  if (typeof window === "undefined") return undefined;
  if (!sessionId) {
    try {
      sessionId = crypto.randomUUID();
    } catch {
      return undefined;
    }
  }
  return sessionId;
}

/**
 * Sends one engagement event. Prefers `navigator.sendBeacon` (survives page
 * unload, the reason it exists for analytics) and falls back to a `keepalive`
 * `fetch`. The response is ignored — a 400/429/network error is silent to the
 * visitor.
 */
export function track(projectId: string, type: EventType): void {
  if (typeof window === "undefined") return;
  const sid = getSessionId();
  if (!sid) return;

  const payload = JSON.stringify({ projectId, type, sessionId: sid });

  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([payload], { type: "application/json" });
      if (navigator.sendBeacon("/api/events", blob)) return;
    }
    void fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Swallow — analytics must never surface to the visitor.
  }
}
