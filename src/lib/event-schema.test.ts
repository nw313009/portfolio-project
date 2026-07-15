import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { eventPayloadSchema } from "@/lib/event-schema";

describe("eventPayloadSchema (strict, hostile-input contract)", () => {
  const validSessionId = randomUUID();

  it("accepts exactly { projectId, type, sessionId } for each in-scope type", () => {
    for (const type of ["view", "hover", "demo-open"] as const) {
      const result = eventPayloadSchema.safeParse({
        projectId: "project-1",
        type,
        sessionId: validSessionId,
      });
      expect(result.success).toBe(true);
    }
  });

  it("REJECTS an unknown field (no silent stripping)", () => {
    const result = eventPayloadSchema.safeParse({
      projectId: "project-1",
      type: "view",
      sessionId: validSessionId,
      extra: "smuggled",
    });
    expect(result.success).toBe(false);
  });

  it("REJECTS a client-supplied timestamp (ts is server-derived only)", () => {
    const result = eventPayloadSchema.safeParse({
      projectId: "project-1",
      type: "view",
      sessionId: validSessionId,
      ts: "2020-01-01T00:00:00.000Z",
    });
    expect(result.success).toBe(false);
  });

  it("REJECTS an event type outside the three in-scope values", () => {
    const result = eventPayloadSchema.safeParse({
      projectId: "project-1",
      type: "outbound-click",
      sessionId: validSessionId,
    });
    expect(result.success).toBe(false);
  });

  it("REJECTS a non-uuid sessionId", () => {
    const result = eventPayloadSchema.safeParse({
      projectId: "project-1",
      type: "view",
      sessionId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("REJECTS an empty projectId and a missing field", () => {
    expect(
      eventPayloadSchema.safeParse({
        projectId: "",
        type: "view",
        sessionId: validSessionId,
      }).success,
    ).toBe(false);
    expect(
      eventPayloadSchema.safeParse({ projectId: "project-1", type: "view" }).success,
    ).toBe(false);
  });
});
