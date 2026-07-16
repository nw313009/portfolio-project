import { describe, expect, it } from "vitest";
import {
  CONTACT_LIMITS,
  contactPayloadSchema,
  hasVisitorContent,
} from "./contact-schema";

describe("contactPayloadSchema (strict, hostile input)", () => {
  it("accepts a valid partial submission and trims whitespace", () => {
    const parsed = contactPayloadSchema.safeParse({
      name: "  Ada Lovelace  ",
      message: "Nice work!",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.name).toBe("Ada Lovelace");
      expect(parsed.data.company).toBeUndefined();
    }
  });

  it("accepts an all-fields submission including the (empty) honeypot", () => {
    const parsed = contactPayloadSchema.safeParse({
      name: "A",
      company: "B",
      position: "C",
      message: "D",
      website: "",
    });
    expect(parsed.success).toBe(true);
  });

  it("REJECTS an unknown field (no silent stripping)", () => {
    const parsed = contactPayloadSchema.safeParse({
      name: "Ada",
      ts: "2020-01-01T00:00:00.000Z",
    });
    expect(parsed.success).toBe(false);
  });

  it("REJECTS an over-length field", () => {
    const parsed = contactPayloadSchema.safeParse({
      name: "a".repeat(CONTACT_LIMITS.name + 1),
    });
    expect(parsed.success).toBe(false);
  });

  it("REJECTS an over-length message", () => {
    const parsed = contactPayloadSchema.safeParse({
      message: "a".repeat(CONTACT_LIMITS.message + 1),
    });
    expect(parsed.success).toBe(false);
  });

  it("parses an empty object (shape-valid) — the empty check is separate", () => {
    const parsed = contactPayloadSchema.safeParse({});
    expect(parsed.success).toBe(true);
  });
});

describe("hasVisitorContent", () => {
  it("is false for an entirely empty / whitespace-only submission", () => {
    expect(hasVisitorContent({})).toBe(false);
    expect(
      hasVisitorContent({ name: "   ", company: "", position: "", message: " " }),
    ).toBe(false);
  });

  it("is true when any single field carries content", () => {
    expect(hasVisitorContent({ message: "hi" })).toBe(true);
    expect(hasVisitorContent({ name: "Ada" })).toBe(true);
    expect(hasVisitorContent({ company: "Analytical Engines" })).toBe(true);
    expect(hasVisitorContent({ position: "Engineer" })).toBe(true);
  });
});
