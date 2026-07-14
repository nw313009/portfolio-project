import { describe, expect, it } from "vitest";
import { isAdmin, parseAdminEmails } from "./is-admin";

describe("parseAdminEmails", () => {
  it("splits, trims, lowercases, and drops empty entries", () => {
    expect(parseAdminEmails("  Me@Example.com , you@example.com ,")).toEqual([
      "me@example.com",
      "you@example.com",
    ]);
  });

  it("returns an empty list for empty/undefined input", () => {
    expect(parseAdminEmails(undefined)).toEqual([]);
    expect(parseAdminEmails(null)).toEqual([]);
    expect(parseAdminEmails("")).toEqual([]);
    expect(parseAdminEmails("   ")).toEqual([]);
  });
});

describe("isAdmin", () => {
  const allowlist = "admin@example.com, second@example.com";

  it("allows an allowlisted email (case-insensitive, trimmed)", () => {
    expect(isAdmin("admin@example.com", allowlist)).toBe(true);
    expect(isAdmin("  ADMIN@Example.com ", allowlist)).toBe(true);
    expect(isAdmin("second@example.com", allowlist)).toBe(true);
  });

  it("denies an authenticated-but-NON-allowlisted email", () => {
    expect(isAdmin("intruder@example.com", allowlist)).toBe(false);
  });

  it("denies null/empty emails and empty allowlists", () => {
    expect(isAdmin(null, allowlist)).toBe(false);
    expect(isAdmin(undefined, allowlist)).toBe(false);
    expect(isAdmin("", allowlist)).toBe(false);
    expect(isAdmin("admin@example.com", "")).toBe(false);
    expect(isAdmin("admin@example.com", undefined)).toBe(false);
  });
});
