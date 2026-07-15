import { describe, it, expect } from "vitest";
import { clientIpFrom, isBot } from "@/lib/bot-filter";

describe("isBot", () => {
  it("treats a missing/empty User-Agent as a bot", () => {
    expect(isBot(null)).toBe(true);
    expect(isBot(undefined)).toBe(true);
    expect(isBot("")).toBe(true);
  });

  it("flags common crawlers and automation tools", () => {
    const bots = [
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
      "curl/8.4.0",
      "Wget/1.21.3",
      "python-requests/2.31.0",
      "Mozilla/5.0 (X11; Linux x86_64) HeadlessChrome/120.0.0.0",
      "facebookexternalhit/1.1",
      "axios/1.6.0",
      "node-fetch/1.0",
    ];
    for (const ua of bots) {
      expect(isBot(ua), ua).toBe(true);
    }
  });

  it("does not flag ordinary desktop/mobile browsers", () => {
    const humans = [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    ];
    for (const ua of humans) {
      expect(isBot(ua), ua).toBe(false);
    }
  });
});

describe("clientIpFrom", () => {
  it("uses the first hop of x-forwarded-for", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.7, 70.41.3.18, 150.172.238.178",
    });
    expect(clientIpFrom(headers)).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", () => {
    const headers = new Headers({ "x-real-ip": "198.51.100.42" });
    expect(clientIpFrom(headers)).toBe("198.51.100.42");
  });

  it("returns a constant bucket when no IP header is present", () => {
    expect(clientIpFrom(new Headers())).toBe("unknown");
  });
});
