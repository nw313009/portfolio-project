import { z } from "zod";

/**
 * The passive-engagement events this slice records. These reuse three of the
 * existing `eventTypeEnum` values from `src/db/schema.ts` (`view`, `hover`,
 * `demo-open`) — NO new enum value is introduced. The mapping (ratified for
 * this slice) is:
 *
 * - `view`      — a project node scrolled into the viewport (fired once).
 * - `hover`     — the visitor DELIBERATELY opened a project's preview via the
 *                 "Preview"/"Open" button click. The legacy enum label is
 *                 `hover`, but the trigger is strictly the button click, never
 *                 hover-intent; the dashboard surfaces it as "Preview opened".
 * - `demo-open` — the visitor clicked a project's demo link.
 *
 * The other schema enum values (`outbound-click`) are intentionally NOT
 * accepted here — this endpoint records only the three in-scope signals.
 */
export const EVENT_TYPES = ["view", "hover", "demo-open"] as const;

export type EventType = (typeof EVENT_TYPES)[number];

/**
 * STRICT payload contract for `POST /api/events`. This is the first
 * unauthenticated write in the system — treat the body as hostile input:
 *
 * - `z.strictObject` REJECTS any unknown field (no silent stripping). A client
 *   that tries to smuggle a `ts`, an IP, or any extra key fails validation.
 * - `projectId` is validated against known projects at write time (in the route
 *   handler), so a well-formed but nonexistent id is still rejected.
 * - `sessionId` is an EPHEMERAL, in-memory-only, per-page-load correlation id
 *   (a client `crypto.randomUUID()`), NOT a visitor id: never persisted to a
 *   cookie/storage, never IP/fingerprint-derived, never joined to identity, and
 *   never labelled "unique visitors". It exists only to feed the NOT-NULL
 *   `events.session_id` column and to count "sessions" in aggregate.
 * - There is deliberately NO timestamp field: the event `ts` is the database's
 *   own `now()` (the column default), never client-supplied.
 */
export const eventPayloadSchema = z.strictObject({
  projectId: z.string().min(1),
  type: z.enum(EVENT_TYPES),
  sessionId: z.uuid(),
});

export type EventPayload = z.infer<typeof eventPayloadSchema>;
