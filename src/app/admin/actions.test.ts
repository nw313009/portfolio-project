import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "next-auth";
import type { GithubRepoMetadata } from "@/lib/github/fetch-repo";

// --- Mocks: authZ boundary, GitHub client, DB writers, ISR cache ---
const { requireAdmin } = vi.hoisted(() => ({ requireAdmin: vi.fn() }));
vi.mock("@/lib/auth/require-admin", () => ({ requireAdmin }));

const { fetchRepoMetadata } = vi.hoisted(() => ({
  fetchRepoMetadata: vi.fn(),
}));
vi.mock("@/lib/github/fetch-repo", () => ({ fetchRepoMetadata }));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

// Keep the real error classes + mapper; mock only the two write helpers so we
// can assert what the action hands the transactional layer.
const { createProjectWithAudit, setProjectStatusWithAudit } = vi.hoisted(() => ({
  createProjectWithAudit: vi.fn(),
  setProjectStatusWithAudit: vi.fn(),
}));
vi.mock("@/db/queries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/db/queries")>();
  return { ...actual, createProjectWithAudit, setProjectStatusWithAudit };
});

const { ingestProject, setPublished } = await import("./actions");
const { DuplicateProjectError, ProjectNotFoundError } = await import(
  "@/db/queries"
);

const ADMIN: Session = {
  user: { email: "admin@example.com", isAdmin: true },
  expires: "2999-01-01T00:00:00.000Z",
} as Session;

const metadata: GithubRepoMetadata = {
  fullName: "octocat/Hello-World",
  name: "Hello-World",
  description: "My first repository on GitHub!",
  primaryLanguage: "TypeScript",
  stars: 7,
  topics: ["demo"],
  createdAt: "2011-01-26T19:01:12Z",
  pushedAt: "2023-06-01T12:00:00Z",
  homepage: null,
  htmlUrl: "https://github.com/octocat/Hello-World",
  isPrivate: false,
};

function ingestForm(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData();
  fd.set("repoUrl", "https://github.com/octocat/Hello-World");
  fd.set("previewType", "webapp");
  for (const [key, value] of Object.entries(overrides)) fd.set(key, value);
  return fd;
}

describe("ingestProject (server action)", () => {
  beforeEach(() => {
    requireAdmin.mockResolvedValue(ADMIN);
    fetchRepoMetadata.mockResolvedValue({ ok: true, metadata });
    createProjectWithAudit.mockResolvedValue({ id: "octocat-hello-world" });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("DENIES a non-allowlisted principal before any GitHub call or DB write", async () => {
    // requireAdmin throws (its redirect) for a forbidden principal.
    requireAdmin.mockRejectedValue(new Error("NEXT_REDIRECT"));

    await expect(ingestProject(null, ingestForm())).rejects.toThrow();
    expect(fetchRepoMetadata).not.toHaveBeenCalled();
    expect(createProjectWithAudit).not.toHaveBeenCalled();
  });

  it("creates a DRAFT row + audit entry via the transactional writer on success", async () => {
    const result = await ingestProject(null, ingestForm());

    expect(result.ok).toBe(true);
    expect(createProjectWithAudit).toHaveBeenCalledTimes(1);
    const [row, actor] = createProjectWithAudit.mock.calls[0];
    expect(row.status).toBe("draft");
    expect(row.githubOwner).toBe("octocat");
    expect(row.githubRepo).toBe("Hello-World");
    expect(row.previewType).toBe("webapp");
    expect(row.preview).toBeNull();
    expect(actor).toBe("admin@example.com");
  });

  it("stores a provided https demoUrl (never fetches it)", async () => {
    await ingestProject(null, ingestForm({ demoUrl: "https://demo.example.com" }));
    const [row] = createProjectWithAudit.mock.calls[0];
    expect(row.demoUrl).toBe("https://demo.example.com");
  });

  it("rejects a non-GitHub URL with no fetch and no write (400-class)", async () => {
    const result = await ingestProject(
      null,
      ingestForm({ repoUrl: "https://gitlab.com/owner/repo" }),
    );
    expect(result).toMatchObject({ ok: false });
    expect(fetchRepoMetadata).not.toHaveBeenCalled();
    expect(createProjectWithAudit).not.toHaveBeenCalled();
  });

  it("rejects an invalid previewType before fetching", async () => {
    const result = await ingestProject(null, ingestForm({ previewType: "banana" }));
    expect(result).toMatchObject({ ok: false });
    expect(fetchRepoMetadata).not.toHaveBeenCalled();
    expect(createProjectWithAudit).not.toHaveBeenCalled();
  });

  it("rejects a non-https demoUrl before fetching", async () => {
    const result = await ingestProject(
      null,
      ingestForm({ demoUrl: "http://insecure.example.com" }),
    );
    expect(result).toMatchObject({ ok: false });
    expect(fetchRepoMetadata).not.toHaveBeenCalled();
    expect(createProjectWithAudit).not.toHaveBeenCalled();
  });

  it("surfaces a not-found/private repo error and writes nothing", async () => {
    fetchRepoMetadata.mockResolvedValue({
      ok: false,
      kind: "not_found",
      message: "Repository octocat/nope was not found.",
    });
    const result = await ingestProject(null, ingestForm());
    expect(result).toEqual({
      ok: false,
      error: "Repository octocat/nope was not found.",
    });
    expect(createProjectWithAudit).not.toHaveBeenCalled();
  });

  it("surfaces a rate-limit error and writes nothing", async () => {
    fetchRepoMetadata.mockResolvedValue({
      ok: false,
      kind: "rate_limited",
      message: "GitHub rate limit hit.",
    });
    const result = await ingestProject(null, ingestForm());
    expect(result).toMatchObject({ ok: false, error: "GitHub rate limit hit." });
    expect(createProjectWithAudit).not.toHaveBeenCalled();
  });

  it("surfaces a network error and writes nothing", async () => {
    fetchRepoMetadata.mockResolvedValue({
      ok: false,
      kind: "network",
      message: "Could not reach GitHub.",
    });
    const result = await ingestProject(null, ingestForm());
    expect(result).toMatchObject({ ok: false });
    expect(createProjectWithAudit).not.toHaveBeenCalled();
  });

  it("rejects a duplicate (unique constraint) with a clear message", async () => {
    createProjectWithAudit.mockRejectedValue(new DuplicateProjectError());
    const result = await ingestProject(null, ingestForm());
    expect(result).toMatchObject({
      ok: false,
      error: "That repository has already been added.",
    });
  });

  it("returns a clear error (no partial write) when the DB transaction fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    createProjectWithAudit.mockRejectedValue(new Error("connection reset"));
    const result = await ingestProject(null, ingestForm());
    expect(result).toMatchObject({ ok: false });
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});

describe("setPublished (server action)", () => {
  beforeEach(() => {
    requireAdmin.mockResolvedValue(ADMIN);
    setProjectStatusWithAudit.mockResolvedValue({ id: "p1", status: "published" });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  function toggleForm(id: string, publish: boolean): FormData {
    const fd = new FormData();
    fd.set("id", id);
    fd.set("publish", String(publish));
    return fd;
  }

  it("DENIES a non-allowlisted principal before any write", async () => {
    requireAdmin.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(setPublished(null, toggleForm("p1", true))).rejects.toThrow();
    expect(setProjectStatusWithAudit).not.toHaveBeenCalled();
  });

  it("publishes: flips status to published, audit-logged with the actor", async () => {
    const result = await setPublished(null, toggleForm("p1", true));
    expect(result.ok).toBe(true);
    expect(setProjectStatusWithAudit).toHaveBeenCalledWith(
      "p1",
      "published",
      "admin@example.com",
    );
  });

  it("unpublishes: flips status to draft", async () => {
    await setPublished(null, toggleForm("p1", false));
    expect(setProjectStatusWithAudit).toHaveBeenCalledWith(
      "p1",
      "draft",
      "admin@example.com",
    );
  });

  it("returns an error when the id is missing", async () => {
    const fd = new FormData();
    fd.set("publish", "true");
    const result = await setPublished(null, fd);
    expect(result).toMatchObject({ ok: false });
    expect(setProjectStatusWithAudit).not.toHaveBeenCalled();
  });

  it("surfaces a not-found project clearly", async () => {
    setProjectStatusWithAudit.mockRejectedValue(new ProjectNotFoundError("p1"));
    const result = await setPublished(null, toggleForm("p1", true));
    expect(result).toMatchObject({ ok: false });
  });
});
