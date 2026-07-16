import { Resend } from "resend";
import type { VisitorFields } from "./contact-schema";

/**
 * Emails an OPTIONAL visitor card to the site owner via Resend. The send IS the
 * transaction: there is NO DB row, NO retry, NO audit trail, and NO fallback —
 * if it fails, the caller tells the visitor honestly rather than faking success
 * and silently losing the submission.
 *
 * Free-tier + unverified-domain reality (expected, NOT worked around here):
 * `from` must be `onboarding@resend.dev`, and delivery only reaches the Resend
 * account's own address. Verifying a domain at deploy time lifts both limits.
 */

/** Resend's shared sender for unverified accounts (free tier). */
const FROM = "Portfolio Visitor <onboarding@resend.dev>";

// Lazily constructed — like the DB/rate-limit clients — so importing this module
// (e.g. under test) never requires `RESEND_API_KEY` to be set; only an actual
// send constructs the client.
let client: Resend | undefined;

function getResend(): Resend {
  if (!client) {
    client = new Resend(process.env.RESEND_API_KEY);
  }
  return client;
}

/**
 * Escapes HTML-significant characters so NO user-supplied text is ever
 * interpolated raw into the email HTML. The admin opens this in a mail client;
 * an unescaped `<img onerror>` / `<script>` / markup must render as inert text,
 * never as live HTML.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function htmlRow(label: string, value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) return "";
  return `<p style="margin:0 0 8px"><strong>${escapeHtml(label)}:</strong> ${escapeHtml(trimmed)}</p>`;
}

function buildHtml(fields: VisitorFields): string {
  const message = fields.message?.trim();
  const messageBlock = message
    ? `<p style="margin:16px 0 4px"><strong>Message</strong></p><p style="margin:0;white-space:pre-wrap">${escapeHtml(message).replace(/\n/g, "<br />")}</p>`
    : "";
  return [
    `<h2 style="margin:0 0 12px">New visitor card</h2>`,
    htmlRow("Name", fields.name),
    htmlRow("Company", fields.company),
    htmlRow("Position", fields.position),
    messageBlock,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildText(fields: VisitorFields): string {
  return [
    "New visitor card",
    fields.name?.trim() ? `Name: ${fields.name.trim()}` : "",
    fields.company?.trim() ? `Company: ${fields.company.trim()}` : "",
    fields.position?.trim() ? `Position: ${fields.position.trim()}` : "",
    fields.message?.trim() ? `Message:\n${fields.message.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

/**
 * Sends the visitor card. Returns `{ ok }` rather than throwing so the route can
 * distinguish an honest failure (tell the visitor) from success. Both a Resend
 * API error and a thrown network error resolve to `{ ok: false }`.
 */
export async function sendVisitorEmail(
  fields: VisitorFields,
): Promise<{ ok: boolean }> {
  const to = process.env.CONTACT_EMAIL;
  if (!to) {
    console.error("[contact] CONTACT_EMAIL is not configured; cannot send.");
    return { ok: false };
  }

  try {
    const { error } = await getResend().emails.send({
      from: FROM,
      to: [to],
      subject: "New visitor card from your portfolio",
      html: buildHtml(fields),
      text: buildText(fields),
    });
    if (error) {
      console.error("[contact] Resend returned an error:", error);
      return { ok: false };
    }
    return { ok: true };
  } catch (error) {
    console.error("[contact] Resend send threw:", error);
    return { ok: false };
  }
}
