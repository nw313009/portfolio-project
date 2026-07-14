import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchRepoMetadata } from "./fetch-repo";

/**
 * GitHub is NEVER hit for real here — `global.fetch` is fully mocked. Each test
 * drives one status/branch of `fetchRepoMetadata`.
 */
const fetchMock = vi.fn();

function jsonResponse(status: number, body: unknown): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  } as unknown as Response;
}

const rawRepo = {
  full_name: "octocat/Hello-World",
  name: "Hello-World",
  description: "My first repository on GitHub!",
  language: "TypeScript",
  stargazers_count: 123,
  topics: ["demo"],
  created_at: "2011-01-26T19:01:12Z",
  pushed_at: "2023-06-01T12:00:00Z",
  homepage: "https://octocat.example.com",
  html_url: "https://github.com/octocat/Hello-World",
  private: false,
};

describe("fetchRepoMetadata", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("hits the api.github.com repos endpoint (never the pasted URL) and maps the payload", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, rawRepo));

    const result = await fetchRepoMetadata("octocat", "Hello-World");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl] = fetchMock.mock.calls[0];
    expect(calledUrl).toBe(
      "https://api.github.com/repos/octocat/Hello-World",
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.metadata.stars).toBe(123);
      expect(result.metadata.primaryLanguage).toBe("TypeScript");
      expect(result.metadata.topics).toEqual(["demo"]);
      expect(result.metadata.createdAt).toBe("2011-01-26T19:01:12Z");
    }
  });

  it("sends no Authorization header when GITHUB_TOKEN is unset", async () => {
    vi.stubEnv("GITHUB_TOKEN", "");
    fetchMock.mockResolvedValue(jsonResponse(200, rawRepo));

    await fetchRepoMetadata("octocat", "Hello-World");

    const headers = fetchMock.mock.calls[0][1].headers as Headers;
    expect(headers.get("Authorization")).toBeNull();
    expect(headers.get("Accept")).toBe("application/vnd.github+json");
    expect(headers.get("User-Agent")).toBeTruthy();
  });

  it("sends a Bearer Authorization header when GITHUB_TOKEN is set", async () => {
    vi.stubEnv("GITHUB_TOKEN", "ghp_secrettoken");
    fetchMock.mockResolvedValue(jsonResponse(200, rawRepo));

    await fetchRepoMetadata("octocat", "Hello-World");

    const headers = fetchMock.mock.calls[0][1].headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer ghp_secrettoken");
  });

  it("returns not_found on 404 (missing or private repo)", async () => {
    fetchMock.mockResolvedValue(jsonResponse(404, { message: "Not Found" }));
    const result = await fetchRepoMetadata("octocat", "nope");
    expect(result).toMatchObject({ ok: false, kind: "not_found" });
  });

  it("returns rate_limited on 403", async () => {
    fetchMock.mockResolvedValue(jsonResponse(403, { message: "rate limited" }));
    const result = await fetchRepoMetadata("octocat", "Hello-World");
    expect(result).toMatchObject({ ok: false, kind: "rate_limited" });
  });

  it("returns rate_limited on 429", async () => {
    fetchMock.mockResolvedValue(jsonResponse(429, { message: "too many" }));
    const result = await fetchRepoMetadata("octocat", "Hello-World");
    expect(result).toMatchObject({ ok: false, kind: "rate_limited" });
  });

  it("returns network on a fetch rejection", async () => {
    fetchMock.mockRejectedValue(new TypeError("network down"));
    const result = await fetchRepoMetadata("octocat", "Hello-World");
    expect(result).toMatchObject({ ok: false, kind: "network" });
  });

  it("returns unexpected on other non-OK statuses", async () => {
    fetchMock.mockResolvedValue(jsonResponse(500, { message: "boom" }));
    const result = await fetchRepoMetadata("octocat", "Hello-World");
    expect(result).toMatchObject({ ok: false, kind: "unexpected" });
  });

  it("returns unexpected when required fields are missing", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { name: "Hello-World" }));
    const result = await fetchRepoMetadata("octocat", "Hello-World");
    expect(result).toMatchObject({ ok: false, kind: "unexpected" });
  });
});
