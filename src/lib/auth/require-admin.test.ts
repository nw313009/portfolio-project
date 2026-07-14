import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "next-auth";

const { authMock, redirectMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  redirectMock: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));

const { checkAdminAccess, requireAdmin } = await import("./require-admin");

const ALLOWLIST = "admin@example.com";

function sessionFor(email: string | null): Session {
  return {
    user: { email, isAdmin: false },
    expires: "2999-01-01T00:00:00.000Z",
  } as Session;
}

describe("resource-layer authZ gate (authoritative, independent of middleware)", () => {
  beforeEach(() => {
    vi.stubEnv("ADMIN_EMAILS", ALLOWLIST);
  });

  afterEach(() => {
    authMock.mockReset();
    redirectMock.mockClear();
    vi.unstubAllEnvs();
  });

  describe("checkAdminAccess", () => {
    it("denies (unauthenticated) when there is no session", async () => {
      authMock.mockResolvedValue(null);
      expect(await checkAdminAccess()).toEqual({
        ok: false,
        reason: "unauthenticated",
      });
    });

    it("passes for an authenticated + allowlisted admin", async () => {
      authMock.mockResolvedValue(sessionFor("admin@example.com"));
      const access = await checkAdminAccess();
      expect(access.ok).toBe(true);
    });

    it("DENIES an authenticated but NON-allowlisted user (the critical case)", async () => {
      authMock.mockResolvedValue(sessionFor("intruder@example.com"));
      expect(await checkAdminAccess()).toEqual({
        ok: false,
        reason: "forbidden",
      });
    });

    it("re-derives admin-ness from the CURRENT allowlist, not a stale token flag", async () => {
      // Session claims isAdmin: true, but the live allowlist no longer contains it.
      authMock.mockResolvedValue({
        user: { email: "intruder@example.com", isAdmin: true },
        expires: "2999-01-01T00:00:00.000Z",
      } as Session);
      const access = await checkAdminAccess();
      expect(access.ok).toBe(false);
    });
  });

  describe("requireAdmin", () => {
    it("redirects unauthenticated users to sign-in", async () => {
      authMock.mockResolvedValue(null);
      await expect(requireAdmin()).rejects.toThrow(
        "NEXT_REDIRECT:/api/auth/signin",
      );
      expect(redirectMock).toHaveBeenCalledWith("/api/auth/signin");
    });

    it("redirects authenticated-but-forbidden users home", async () => {
      authMock.mockResolvedValue(sessionFor("intruder@example.com"));
      await expect(requireAdmin()).rejects.toThrow("NEXT_REDIRECT:/");
      expect(redirectMock).toHaveBeenCalledWith("/");
    });

    it("returns the session for an allowlisted admin", async () => {
      authMock.mockResolvedValue(sessionFor("admin@example.com"));
      const session = await requireAdmin();
      expect(session.user?.email).toBe("admin@example.com");
      expect(redirectMock).not.toHaveBeenCalled();
    });
  });
});
