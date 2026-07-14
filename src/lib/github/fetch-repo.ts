/**
 * Server-only GitHub REST client for a single repository's metadata.
 *
 * Only ever hits `https://api.github.com/repos/{owner}/{repo}` — never the URL
 * the admin pasted (SSRF guard, see `parse-repo-url.ts`). Reads an OPTIONAL
 * `GITHUB_TOKEN` to raise the rate limit (5000/hr vs 60/hr unauthenticated);
 * absent is fine and it stays unauthenticated. Returns a discriminated result
 * so the caller can turn each failure mode into a clear message with no
 * partial write.
 */

export interface GithubRepoMetadata {
  fullName: string;
  name: string;
  description: string | null;
  primaryLanguage: string | null;
  stars: number;
  topics: string[];
  /** ISO timestamps from the API. */
  createdAt: string;
  pushedAt: string | null;
  homepage: string | null;
  htmlUrl: string;
  isPrivate: boolean;
}

export type FetchRepoErrorKind =
  | "not_found"
  | "rate_limited"
  | "network"
  | "unexpected";

export type FetchRepoResult =
  | { ok: true; metadata: GithubRepoMetadata }
  | { ok: false; kind: FetchRepoErrorKind; message: string };

/** Raw subset of the GitHub "Get a repository" response we consume. */
interface RawRepo {
  full_name?: string;
  name?: string;
  description?: string | null;
  language?: string | null;
  stargazers_count?: number;
  topics?: string[];
  created_at?: string;
  pushed_at?: string | null;
  homepage?: string | null;
  html_url?: string;
  private?: boolean;
}

const GITHUB_API_BASE = "https://api.github.com";

function buildHeaders(): Headers {
  const headers = new Headers({
    Accept: "application/vnd.github+json",
    // GitHub rejects API requests without a User-Agent.
    "User-Agent": "projects-homepage",
  });
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return headers;
}

export async function fetchRepoMetadata(
  owner: string,
  repo: string,
): Promise<FetchRepoResult> {
  const url = `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;

  let response: Response;
  try {
    response = await fetch(url, { headers: buildHeaders() });
  } catch {
    return {
      ok: false,
      kind: "network",
      message: "Could not reach GitHub. Check your connection and try again.",
    };
  }

  if (response.status === 404) {
    return {
      ok: false,
      kind: "not_found",
      message: `Repository ${owner}/${repo} was not found. It may be private or misspelled.`,
    };
  }

  // 403 (rate limit / abuse detection) and 429 (too many requests) both mean
  // "backed off by GitHub". Unauthenticated calls are 60/hr/IP.
  if (response.status === 403 || response.status === 429) {
    return {
      ok: false,
      kind: "rate_limited",
      message:
        "GitHub rate limit hit. Set GITHUB_TOKEN to raise it, or try again later.",
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      kind: "unexpected",
      message: `GitHub returned an unexpected status (${response.status}).`,
    };
  }

  let raw: RawRepo;
  try {
    raw = (await response.json()) as RawRepo;
  } catch {
    return {
      ok: false,
      kind: "unexpected",
      message: "GitHub returned a response that could not be parsed.",
    };
  }

  if (!raw.full_name || !raw.name || !raw.created_at || !raw.html_url) {
    return {
      ok: false,
      kind: "unexpected",
      message: "GitHub response was missing required repository fields.",
    };
  }

  return {
    ok: true,
    metadata: {
      fullName: raw.full_name,
      name: raw.name,
      description: raw.description ?? null,
      primaryLanguage: raw.language ?? null,
      stars: raw.stargazers_count ?? 0,
      topics: raw.topics ?? [],
      createdAt: raw.created_at,
      pushedAt: raw.pushed_at ?? null,
      homepage: raw.homepage ? raw.homepage : null,
      htmlUrl: raw.html_url,
      isPrivate: raw.private ?? false,
    },
  };
}
