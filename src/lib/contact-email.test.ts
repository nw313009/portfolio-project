import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

const { escapeHtml, sendVisitorEmail } = await import("./contact-email");

describe("escapeHtml", () => {
  it("escapes every HTML-significant character", () => {
    expect(escapeHtml(`<script>alert("x")&'</script>`)).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&amp;&#39;&lt;/script&gt;",
    );
  });
});

describe("sendVisitorEmail", () => {
  beforeEach(() => {
    vi.stubEnv("CONTACT_EMAIL", "owner@example.com");
    vi.stubEnv("RESEND_API_KEY", "re_test");
    sendMock.mockResolvedValue({ data: { id: "abc" }, error: null });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("sends to CONTACT_EMAIL from the resend.dev sender with escaped content", async () => {
    const result = await sendVisitorEmail({
      name: "Ada <b>Lovelace</b>",
      message: `<img src=x onerror="alert(1)">`,
    });

    expect(result.ok).toBe(true);
    expect(sendMock).toHaveBeenCalledTimes(1);
    const arg = sendMock.mock.calls[0][0];
    expect(arg.to).toEqual(["owner@example.com"]);
    expect(arg.from).toContain("onboarding@resend.dev");

    // Raw HTML must NOT be interpolated into the body; it must be escaped.
    expect(arg.html).not.toContain("<img src=x");
    expect(arg.html).not.toContain("<b>Lovelace</b>");
    expect(arg.html).toContain("&lt;img src=x");
    expect(arg.html).toContain("Ada &lt;b&gt;Lovelace&lt;/b&gt;");
  });

  it("returns ok:false when Resend returns an error (no throw)", async () => {
    sendMock.mockResolvedValue({ data: null, error: { message: "nope" } });
    const result = await sendVisitorEmail({ message: "hi" });
    expect(result.ok).toBe(false);
  });

  it("returns ok:false when the send throws (network failure)", async () => {
    sendMock.mockRejectedValue(new Error("network"));
    const result = await sendVisitorEmail({ message: "hi" });
    expect(result.ok).toBe(false);
  });

  it("returns ok:false and does not send when CONTACT_EMAIL is unset", async () => {
    vi.stubEnv("CONTACT_EMAIL", "");
    const result = await sendVisitorEmail({ message: "hi" });
    expect(result.ok).toBe(false);
    expect(sendMock).not.toHaveBeenCalled();
  });
});
