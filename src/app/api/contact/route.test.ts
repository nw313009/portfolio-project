import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { checkContactRateLimitMock } = vi.hoisted(() => ({
  checkContactRateLimitMock: vi.fn(),
}));
vi.mock("@/lib/rate-limit", () => ({
  checkContactRateLimit: checkContactRateLimitMock,
}));

const { sendVisitorEmailMock } = vi.hoisted(() => ({
  sendVisitorEmailMock: vi.fn(),
}));
vi.mock("@/lib/contact-email", () => ({
  sendVisitorEmail: sendVisitorEmailMock,
}));

// The route imports NOTHING from the DB layer — no write happens on any path.
// Mock it anyway and assert it is never touched, documenting that invariant.
const { recordEventMock } = vi.hoisted(() => ({ recordEventMock: vi.fn() }));
vi.mock("@/db/queries", () => ({
  recordEvent: recordEventMock,
  projectExists: vi.fn(),
}));

const { POST } = await import("./route");

const HUMAN_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36";

function makeRequest(
  body: unknown,
  headers: Record<string, string> = {},
): Request {
  return new Request("http://localhost/api/contact", {
    method: "POST",
    headers: {
      "user-agent": HUMAN_UA,
      "content-type": "application/json",
      "x-forwarded-for": "203.0.113.9",
      ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/contact (public visitor card, hostile input)", () => {
  beforeEach(() => {
    checkContactRateLimitMock.mockResolvedValue({ success: true });
    sendVisitorEmailMock.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("sends a valid submission (honeypot excluded) and returns ok", async () => {
    const res = await POST(
      makeRequest({
        name: "Ada",
        company: "Analytical Engines",
        position: "Engineer",
        message: "Hello!",
        website: "",
      }),
    );
    expect(res.status).toBe(200);
    expect(sendVisitorEmailMock).toHaveBeenCalledTimes(1);
    expect(sendVisitorEmailMock).toHaveBeenCalledWith({
      name: "Ada",
      company: "Analytical Engines",
      position: "Engineer",
      message: "Hello!",
    });
    expect(recordEventMock).not.toHaveBeenCalled();
  });

  it("rejects an entirely empty submission with 400 and does not send", async () => {
    const res = await POST(makeRequest({ name: "  ", message: "" }));
    expect(res.status).toBe(400);
    expect(sendVisitorEmailMock).not.toHaveBeenCalled();
  });

  it("rejects an unknown field with 400 and does not send", async () => {
    const res = await POST(
      makeRequest({ name: "Ada", ts: "2020-01-01T00:00:00.000Z" }),
    );
    expect(res.status).toBe(400);
    expect(sendVisitorEmailMock).not.toHaveBeenCalled();
  });

  it("rejects an over-length field with 400 and does not send", async () => {
    const res = await POST(makeRequest({ name: "a".repeat(101) }));
    expect(res.status).toBe(400);
    expect(sendVisitorEmailMock).not.toHaveBeenCalled();
  });

  it("passes message content through unchanged (escaping is the email layer's job)", async () => {
    await POST(makeRequest({ message: `<script>alert(1)</script>` }));
    expect(sendVisitorEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ message: `<script>alert(1)</script>` }),
    );
  });

  it("HONEYPOT populated → returns success, does NOT send (catch never revealed)", async () => {
    const res = await POST(
      makeRequest({ name: "Ada", website: "http://spam.example" }),
    );
    expect(res.status).toBe(200);
    expect(sendVisitorEmailMock).not.toHaveBeenCalled();
  });

  it("rate-limited → OPAQUE success, does NOT send", async () => {
    checkContactRateLimitMock.mockResolvedValue({ success: false });
    const res = await POST(makeRequest({ message: "hi" }));
    expect(res.status).toBe(200);
    expect(sendVisitorEmailMock).not.toHaveBeenCalled();
  });

  it("bot User-Agent → OPAQUE success, does NOT send or rate-limit", async () => {
    const res = await POST(
      makeRequest(
        { message: "hi" },
        { "user-agent": "Mozilla/5.0 (compatible; Googlebot/2.1)" },
      ),
    );
    expect(res.status).toBe(200);
    expect(sendVisitorEmailMock).not.toHaveBeenCalled();
    expect(checkContactRateLimitMock).not.toHaveBeenCalled();
  });

  it("send FAILURE → honest 502 error, never a fake success", async () => {
    sendVisitorEmailMock.mockResolvedValue({ ok: false });
    const res = await POST(makeRequest({ message: "hi" }));
    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.ok).toBeUndefined();
  });

  it("returns 400 for a non-JSON body and does not send", async () => {
    const res = await POST(makeRequest("not json{"));
    expect(res.status).toBe(400);
    expect(sendVisitorEmailMock).not.toHaveBeenCalled();
  });

  it("never writes to the DB on any path", async () => {
    await POST(makeRequest({ message: "hi" }));
    await POST(makeRequest({}));
    await POST(makeRequest({ name: "Ada", website: "x" }));
    expect(recordEventMock).not.toHaveBeenCalled();
  });
});
