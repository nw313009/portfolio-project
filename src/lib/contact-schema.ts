import { z } from "zod";

/**
 * Contract for the OPTIONAL "who's visiting" card (Slice 6). This is DECLARED,
 * consent-based identity — a visitor may voluntarily share a name / company /
 * position / short message, ALL optional. The submission is EMAILED to the site
 * owner: there is NO DB row, NO schema change, and it deliberately does NOT join
 * to the anonymous event counts (no visitor id is minted, correlated, or stored).
 *
 * This is a PUBLIC, unauthenticated write whose abuse target is the admin's
 * inbox, so the body is treated as hostile input:
 *
 * - `z.strictObject` REJECTS any unknown field (no silent stripping) — a client
 *   that tries to smuggle extra keys (an id, an IP, a client timestamp) fails
 *   validation.
 * - Every text field has a HARD length cap (see `CONTACT_LIMITS`); name/company/
 *   position are short, the message is capped tight.
 * - There is deliberately NO timestamp, no email, and no id field — nothing that
 *   would let this be correlated with the anonymous events stream.
 * - `website` is a HONEYPOT (see below), part of the strict shape so a normal
 *   submission that includes it (empty) isn't rejected as an unknown field.
 */

/** Hard, stated per-field length caps. Enforced server-side AND mirrored on the client. */
export const CONTACT_LIMITS = {
  name: 100,
  company: 100,
  position: 100,
  message: 1000,
} as const;

/**
 * The honeypot field name. It is rendered hidden and off-screen, never shown to
 * or fillable by a real user, and never announced to assistive tech. A populated
 * value is a strong bot signal — the route silently accepts and DISCARDS such a
 * submission (never revealing the catch). Capped so it can't be used to smuggle
 * an unbounded payload.
 */
export const HONEYPOT_FIELD = "website" as const;

/** A trimmed, length-capped optional text field. Empty/whitespace-only is allowed at parse time; the "at least one field" rule is enforced separately so the honeypot can short-circuit first. */
const optionalText = (max: number) => z.string().trim().max(max).optional();

export const contactPayloadSchema = z.strictObject({
  name: optionalText(CONTACT_LIMITS.name),
  company: optionalText(CONTACT_LIMITS.company),
  position: optionalText(CONTACT_LIMITS.position),
  message: optionalText(CONTACT_LIMITS.message),
  [HONEYPOT_FIELD]: z.string().max(200).optional(),
});

export type ContactPayload = z.infer<typeof contactPayloadSchema>;

/** The real visitor-supplied fields the email is built from (the honeypot excluded). */
export type VisitorFields = Pick<
  ContactPayload,
  "name" | "company" | "position" | "message"
>;

/**
 * True when the submission carries at least one non-empty real field. An
 * entirely empty form is rejected — on the client (before sending) and on the
 * server (after validation, after the honeypot short-circuit).
 */
export function hasVisitorContent(fields: VisitorFields): boolean {
  return Boolean(
    fields.name?.trim() ||
      fields.company?.trim() ||
      fields.position?.trim() ||
      fields.message?.trim(),
  );
}
