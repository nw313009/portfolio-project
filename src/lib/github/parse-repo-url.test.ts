import { describe, expect, it } from "vitest";
import { InvalidRepoUrlError, parseGithubRepoUrl } from "./parse-repo-url";

describe("parseGithubRepoUrl", () => {
  it("parses a plain https repo URL", () => {
    expect(parseGithubRepoUrl("https://github.com/vercel/next.js")).toEqual({
      owner: "vercel",
      repo: "next.js",
    });
  });

  it.each([
    ["with a .git suffix", "https://github.com/facebook/react.git", "react"],
    ["with a trailing slash", "https://github.com/facebook/react/", "react"],
    [
      "with extra /tree/<branch> segments",
      "https://github.com/facebook/react/tree/main/packages",
      "react",
    ],
  ])("parses a URL %s", (_label, url, expectedRepo) => {
    expect(parseGithubRepoUrl(url)).toEqual({
      owner: "facebook",
      repo: expectedRepo,
    });
  });

  it("accepts the www subdomain", () => {
    expect(parseGithubRepoUrl("https://www.github.com/owner/repo")).toEqual({
      owner: "owner",
      repo: "repo",
    });
  });

  it("accepts http (not just https)", () => {
    expect(parseGithubRepoUrl("http://github.com/owner/repo")).toEqual({
      owner: "owner",
      repo: "repo",
    });
  });

  it("accepts a scheme-less paste", () => {
    expect(parseGithubRepoUrl("github.com/owner/repo")).toEqual({
      owner: "owner",
      repo: "repo",
    });
  });

  it("trims surrounding whitespace", () => {
    expect(parseGithubRepoUrl("  https://github.com/owner/repo  ")).toEqual({
      owner: "owner",
      repo: "repo",
    });
  });

  it.each([
    ["an empty string", ""],
    ["a non-GitHub host", "https://gitlab.com/owner/repo"],
    ["a look-alike host", "https://github.com.evil.com/owner/repo"],
    ["an internal host (SSRF attempt)", "http://169.254.169.254/owner/repo"],
    ["a GitHub URL with no repo", "https://github.com/owner"],
    ["the bare host", "https://github.com/"],
    ["a totally invalid string", "not a url at all !!"],
  ])("rejects %s", (_label, input) => {
    expect(() => parseGithubRepoUrl(input)).toThrow(InvalidRepoUrlError);
  });
});
