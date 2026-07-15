import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";

const { checkEventRateLimitMock } = vi.hoisted(() => ({
  checkEventRateLimitMock: vi.fn(),
}));
vi.mock("@/lib/rate-limit", () => ({
  checkEventRateLimit: checkEventRateLimitMock,
}));

const { projectExistsMock, recordEventMock } = vi.hoisted(() => ({
  projectExistsMock: vi.fn(),
  recordEventMock: vi.fn(),
}));
vi.mock("@/db/queries", () => ({
  projectExists: projectExistsMock,
  recordEvent: recordEventMock,
}));

const { POST } = await import("./route");

const SESSION_ID = randomUUID();
const HUMAN_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36";

function makeRequest(
  body: unknown,
  headers: Record<string, string> = {},
): Request {
  return new Request("http://localhost/api/events", {
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

describe("POST /api/events (public, hostile-input beacon)", () => {
  beforeEach(() => {
    checkEventRateLimitMock.mockResolvedValue({ success: true });
    projectExistsMock.mockResolvedValue(true);
    recordEventMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("records a valid event and returns 204", async () => {
    const res = await POST(
      makeRequest({ projectId: "p1", type: "view", sessionId: SESSION_ID }),
    );
    expect(res.status).toBe(204);
    expect(recordEventMock).toHaveBeenCalledTimes(1);
  });

  it("derives the timestamp server-side: the recorded row carries NO client ts", async () => {
    await POST(
      makeRequest({ projectId: "p1", type: "demo-open", sessionId: SESSION_ID }),
    );
    // Exact-object match proves only these three keys are written — no `ts`,
    // no smuggled fields reach the DB layer.
    expect(recordEventMock).toHaveBeenCalledWith({
      projectId: "p1",
      type: "demo-open",
      sessionId: SESSION_ID,
    });
  });

  it("rejects an unknown-field payload with 400 and records nothing", async () => {
    const res = await POST(
      makeRequest({
        projectId: "p1",
        type: "view",
        sessionId: SESSION_ID,
        ts: "2020-01-01T00:00:00.000Z",
      }),
    );
    expect(res.status).toBe(400);
    expect(recordEventMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid payload (bad type) with 400 and records nothing", async () => {
    const res = await POST(
      makeRequest({ projectId: "p1", type: "nope", sessionId: SESSION_ID }),
    );
    expect(res.status).toBe(400);
    expect(recordEventMock).not.toHaveBeenCalled();
  });

  it("rejects an unknown projectId with 400 and records nothing", async () => {
    projectExistsMock.mockResolvedValue(false);
    const res = await POST(
      makeRequest({ projectId: "ghost", type: "view", sessionId: SESSION_ID }),
    );
    expect(res.status).toBe(400);
    expect(recordEventMock).not.toHaveBeenCalled();
  });

  it("does NOT record events from a bot User-Agent (returns 204, no work done)", async () => {
    const res = await POST(
      makeRequest(
        { projectId: "p1", type: "view", sessionId: SESSION_ID },
        { "user-agent": "Mozilla/5.0 (compatible; Googlebot/2.1)" },
      ),
    );
    expect(res.status).toBe(204);
    expect(recordEventMock).not.toHaveBeenCalled();
    // Short-circuits before the (more expensive) rate-limit and DB checks.
    expect(checkEventRateLimitMock).not.toHaveBeenCalled();
    expect(projectExistsMock).not.toHaveBeenCalled();
  });

  it("returns 429 and records nothing when the rate limit is exceeded", async () => {
    checkEventRateLimitMock.mockResolvedValue({ success: false });
    const res = await POST(
      makeRequest({ projectId: "p1", type: "view", sessionId: SESSION_ID }),
    );
    expect(res.status).toBe(429);
    expect(recordEventMock).not.toHaveBeenCalled();
  });

  it("returns 400 for a non-JSON body", async () => {
    const res = await POST(makeRequest("not json{"));
    expect(res.status).toBe(400);
    expect(recordEventMock).not.toHaveBeenCalled();
  });
});
