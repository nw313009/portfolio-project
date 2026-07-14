import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "next-auth";

const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));
vi.mock("@/auth", () => ({ auth: authMock }));

const { POST } = await import("./route");

function sessionFor(email: string): Session {
  return {
    user: { email, isAdmin: false },
    expires: "2999-01-01T00:00:00.000Z",
  } as Session;
}

/**
 * Protected WRITE route handler tested DIRECTLY (not through middleware) to prove
 * the resource layer is the authoritative boundary: it must deny even if
 * middleware never ran / was bypassed.
 */
describe("POST /api/admin/ping (authoritative write gate)", () => {
  beforeEach(() => {
    vi.stubEnv("ADMIN_EMAILS", "admin@example.com");
  });

  afterEach(() => {
    authMock.mockReset();
    vi.unstubAllEnvs();
  });

  it("returns 401 when unauthenticated", async () => {
    authMock.mockResolvedValue(null);
    const res = await POST();
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "unauthenticated" });
  });

  it("returns 403 for an authenticated but NON-allowlisted user", async () => {
    authMock.mockResolvedValue(sessionFor("intruder@example.com"));
    const res = await POST();
    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ error: "forbidden" });
  });

  it("returns 200 for an allowlisted admin", async () => {
    authMock.mockResolvedValue(sessionFor("admin@example.com"));
    const res = await POST();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      ok: true,
      email: "admin@example.com",
    });
  });
});
