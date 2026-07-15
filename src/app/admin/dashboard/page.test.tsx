import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Session } from "next-auth";
import type { EventAggregates } from "@/db/queries";

/**
 * Proves the dashboard's authoritative resource-layer authZ: the principal is
 * injected via a mocked `auth()` (no live GitHub OAuth), and the REAL
 * `requireAdmin()` + allowlist run. A non-allowlisted principal must be denied
 * BEFORE any aggregate data is read.
 */
const { authMock, redirectMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  redirectMock: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));
vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));

const { getEventAggregatesMock, getAllProjectsMock } = vi.hoisted(() => ({
  getEventAggregatesMock: vi.fn(),
  getAllProjectsMock: vi.fn(),
}));
vi.mock("@/db/queries", () => ({
  getEventAggregates: getEventAggregatesMock,
  getAllProjects: getAllProjectsMock,
}));

const { default: DashboardPage } = await import("./page");

const ALLOWLIST = "admin@example.com";

function sessionFor(email: string): Session {
  return {
    user: { email, isAdmin: false },
    expires: "2999-01-01T00:00:00.000Z",
  } as Session;
}

const aggregates: EventAggregates = {
  perProject: [
    { projectId: "p1", view: 10, hover: 4, demoOpen: 2, total: 16 },
  ],
  totalsByType: { view: 10, hover: 4, demoOpen: 2 },
  totalEvents: 16,
  recentCount: 5,
  sessions: 7,
};

describe("/admin/dashboard authZ", () => {
  beforeEach(() => {
    vi.stubEnv("ADMIN_EMAILS", ALLOWLIST);
    getEventAggregatesMock.mockResolvedValue(aggregates);
    getAllProjectsMock.mockResolvedValue([
      { id: "p1", title: "Project One" },
    ]);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("DENIES a non-allowlisted principal at the resource layer, before reading any data", async () => {
    authMock.mockResolvedValue(sessionFor("intruder@example.com"));
    await expect(DashboardPage()).rejects.toThrow("NEXT_REDIRECT:/");
    expect(getEventAggregatesMock).not.toHaveBeenCalled();
    expect(getAllProjectsMock).not.toHaveBeenCalled();
  });

  it("DENIES an unauthenticated principal (redirects to sign-in)", async () => {
    authMock.mockResolvedValue(null);
    await expect(DashboardPage()).rejects.toThrow("NEXT_REDIRECT:/api/auth/signin");
    expect(getEventAggregatesMock).not.toHaveBeenCalled();
  });

  it("renders aggregates for an allowlisted admin and labels distinct sessions 'Sessions', never 'unique visitors'", async () => {
    authMock.mockResolvedValue(sessionFor("admin@example.com"));
    const ui = await DashboardPage();
    render(ui);

    expect(screen.getByRole("heading", { name: "Engagement" })).toBeInTheDocument();
    expect(screen.getByText("Sessions")).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Preview opened" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Project One")).toBeInTheDocument();
    // Never reframe the anonymous session count as people.
    expect(screen.queryByText(/unique visitor/i)).not.toBeInTheDocument();
  });
});
