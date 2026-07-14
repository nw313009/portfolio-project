/**
 * Parse a pasted GitHub repository URL into `{ owner, repo }`.
 *
 * SECURITY: this only extracts the owner/repo identity. It is NEVER used to
 * fetch the pasted URL directly — the ingestion path fetches
 * `https://api.github.com/repos/{owner}/{repo}` instead (see
 * `fetch-repo.ts`), which is the SSRF guard: an attacker can't point us at an
 * internal host by pasting a crafted URL.
 */

export interface RepoRef {
  owner: string;
  repo: string;
}

/** Thrown for anything that isn't a parseable `github.com/<owner>/<repo>` URL. */
export class InvalidRepoUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidRepoUrlError";
  }
}

const ALLOWED_HOSTS = new Set(["github.com", "www.github.com"]);
// GitHub owners: alphanumeric + single hyphens. Repos additionally allow
// `.` and `_`. Both are validated so we never forward junk to the API call.
const OWNER_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/;
const REPO_RE = /^[A-Za-z0-9._-]+$/;

/**
 * Accepts the common shapes an admin might paste:
 *   https://github.com/owner/repo
 *   https://github.com/owner/repo.git
 *   https://github.com/owner/repo/            (trailing slash)
 *   https://github.com/owner/repo/tree/main   (extra path segments ignored)
 *   http://github.com/owner/repo
 *   https://www.github.com/owner/repo
 *   github.com/owner/repo                      (scheme optional)
 * Rejects non-github.com hosts and anything without an owner + repo.
 */
export function parseGithubRepoUrl(input: string): RepoRef {
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    throw new InvalidRepoUrlError("Repository URL is required.");
  }

  // Allow a scheme-less paste like `github.com/owner/repo` by defaulting to
  // https before handing it to the URL parser.
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new InvalidRepoUrlError(`"${input}" is not a valid URL.`);
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new InvalidRepoUrlError("Only http(s) GitHub URLs are supported.");
  }

  if (!ALLOWED_HOSTS.has(url.hostname.toLowerCase())) {
    throw new InvalidRepoUrlError(
      `"${url.hostname}" is not a GitHub URL. Paste a github.com repository link.`,
    );
  }

  const segments = url.pathname.split("/").filter((segment) => segment.length > 0);
  if (segments.length < 2) {
    throw new InvalidRepoUrlError(
      "URL must point to a repository, e.g. https://github.com/owner/repo.",
    );
  }

  const owner = segments[0];
  const repo = segments[1].replace(/\.git$/i, "");

  if (!OWNER_RE.test(owner) || !REPO_RE.test(repo)) {
    throw new InvalidRepoUrlError(
      `Could not parse a valid owner/repo from "${input}".`,
    );
  }

  return { owner, repo };
}
