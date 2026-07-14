import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "next-auth";
import { authConfig } from "./auth.config";

/**
 * Unit tests for the OPTIMISTIC middleware decision (the `authorized` callback)
 * and the authN `signIn` hook, driven with a synthetic mocked principal — no
 * real GitHub OAuth. This mirrors the resource-layer matrix at the edge layer.
 */

const authorized = authConfig.callbacks!.authorized!;
const signIn = authConfig.callbacks!.signIn!;

function principal(email: string | null): Session {
  return {
    user: { email, isAdmin: false },
    expires: "2999-01-01T00:00:00.000Z",
  } as Session;
}

// The callback only reads `auth`; `request` is required by the type but unused.
function callAuthorized(auth: Session | null) {
  return authorized({ auth, request: {} as never } as never) as boolean;
}

describe("authorized callback (optimistic middleware gate)", () => {
  beforeEach(() => {
    vi.stubEnv("ADMIN_EMAILS", "admin@example.com");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("denies when there is no session", () => {
    expect(callAuthorized(null)).toBe(false);
  });

  it("allows an allowlisted admin", () => {
    expect(callAuthorized(principal("admin@example.com"))).toBe(true);
  });

  it("denies an authenticated but NON-allowlisted user", () => {
    expect(callAuthorized(principal("intruder@example.com"))).toBe(false);
  });
});

describe("signIn callback (authN only — authZ is separate)", () => {
  it("allows GitHub authentication", () => {
    expect(
      signIn({ account: { provider: "github" } } as never),
    ).toBe(true);
  });

  it("rejects a non-GitHub provider", () => {
    expect(signIn({ account: { provider: "credentials" } } as never)).toBe(
      false,
    );
  });
});
