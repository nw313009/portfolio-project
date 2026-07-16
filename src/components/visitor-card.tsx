"use client";

import { useId, useState, type FormEvent } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CONTACT_LIMITS, HONEYPOT_FIELD } from "@/lib/contact-schema";

/**
 * OPTIONAL "who's visiting" card (Slice 6), shown once at the END of the
 * timeline (after the last project node) — NOT a modal on arrival. A visitor
 * may voluntarily share a name / company / position / short message (ALL
 * optional); the submission is EMAILED to the site owner.
 *
 * DECLARED, consent-based identity — NOT tracking:
 * - Dismissal is client-side state ONLY. It reappears on refresh; that is the
 *   accepted cost of not tracking. It is deliberately NOT persisted to a
 *   cookie, `localStorage`, or `sessionStorage`.
 * - No visitor id, no correlation with the anonymous event counts.
 *
 * The copy is exact about the privacy posture: not tracked, not stored in the
 * database — sent directly to the site owner as an email (NOT "not stored"
 * unqualified: it lives in an inbox).
 */

type Status = "idle" | "submitting" | "success" | "error";

export function VisitorCard() {
  const fieldId = useId();
  const [dismissed, setDismissed] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [position, setPosition] = useState("");
  const [message, setMessage] = useState("");
  // Honeypot: a real user never sees or fills this. Held in state only so the
  // field is controlled; its value is submitted verbatim for the server to catch.
  const [honeypot, setHoneypot] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  if (dismissed) return null;

  const hasContent = Boolean(
    name.trim() || company.trim() || position.trim() || message.trim(),
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError(null);

    // Reject an entirely empty form client-side (the server re-checks too).
    if (!hasContent) {
      setValidationError("Please fill in at least one field before sending.");
      return;
    }

    setStatus("submitting");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          company,
          position,
          message,
          [HONEYPOT_FIELD]: honeypot,
        }),
      });
      setStatus(res.ok ? "success" : "error");
    } catch {
      // The send is the transaction — an honest failure, not a fake success.
      setStatus("error");
    }
  }

  return (
    <section className="mx-auto w-full max-w-4xl px-4 pb-12" aria-label="Visitor card">
      <Card className="relative">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="absolute right-2 top-2"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
        >
          <span aria-hidden="true">×</span>
        </Button>

        <CardHeader>
          <CardTitle>Who&apos;s visiting?</CardTitle>
          <CardDescription>
            Optional — say hello if you like. This isn&apos;t tracked and isn&apos;t
            stored in our database; it&apos;s sent directly to the site owner as an
            email. Every field is optional.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {status === "success" ? (
            <p className="text-sm text-muted-foreground" role="status">
              Thanks for saying hello — your note is on its way to the owner&apos;s inbox.
            </p>
          ) : (
            <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`${fieldId}-name`}>Name</Label>
                  <Input
                    id={`${fieldId}-name`}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={CONTACT_LIMITS.name}
                    autoComplete="name"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`${fieldId}-company`}>Company</Label>
                  <Input
                    id={`${fieldId}-company`}
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    maxLength={CONTACT_LIMITS.company}
                    autoComplete="organization"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`${fieldId}-position`}>Position</Label>
                  <Input
                    id={`${fieldId}-position`}
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    maxLength={CONTACT_LIMITS.position}
                    autoComplete="organization-title"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`${fieldId}-message`}>Message</Label>
                <Textarea
                  id={`${fieldId}-message`}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={CONTACT_LIMITS.message}
                  rows={3}
                />
              </div>

              {/* Honeypot: off-screen, not tabbable, hidden from assistive tech. */}
              <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
                <label htmlFor={`${fieldId}-website`}>Website</label>
                <input
                  id={`${fieldId}-website`}
                  name={HONEYPOT_FIELD}
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                />
              </div>

              {validationError ? (
                <p className="text-sm text-destructive" role="alert">
                  {validationError}
                </p>
              ) : null}
              {status === "error" ? (
                <p className="text-sm text-destructive" role="alert">
                  Something went wrong sending your note. Please try again.
                </p>
              ) : null}

              <div className="flex items-center gap-3">
                <Button type="submit" disabled={status === "submitting"}>
                  {status === "submitting" ? "Sending…" : "Say hello"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
