import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { VisitorCard } from "@/components/visitor-card";

describe("VisitorCard", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("renders the optional prompt with honest, qualified privacy copy", () => {
    render(<VisitorCard />);
    expect(screen.getByText(/who's visiting/i)).toBeInTheDocument();
    const copy = screen.getByText(/sent directly to the site owner as an email/i);
    expect(copy).toBeInTheDocument();
    expect(copy.textContent).toMatch(/isn't tracked/i);
    expect(copy.textContent).toMatch(/isn't\s+stored in our database/i);
  });

  it("dismisses to nothing on the dismiss button (client-side only)", () => {
    const { container } = render(<VisitorCard />);
    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(container).toBeEmptyDOMElement();
  });

  it("rejects an entirely empty submission client-side without calling fetch", async () => {
    render(<VisitorCard />);
    fireEvent.click(screen.getByRole("button", { name: /say hello/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/at least one field/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("submits a filled form to /api/contact and shows a success state", async () => {
    render(<VisitorCard />);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Ada" } });
    fireEvent.click(screen.getByRole("button", { name: /say hello/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/contact");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body).name).toBe("Ada");

    expect(await screen.findByText(/on its way to the owner's inbox/i)).toBeInTheDocument();
  });

  it("shows an honest error (not a fake success) when the send fails", async () => {
    fetchMock.mockResolvedValue({ ok: false });
    render(<VisitorCard />);
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "hi" } });
    fireEvent.click(screen.getByRole("button", { name: /say hello/i }));

    expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.queryByText(/on its way/i)).not.toBeInTheDocument();
  });

  it("includes a hidden, non-tabbable honeypot field", () => {
    render(<VisitorCard />);
    const honeypot = screen.getByLabelText("Website");
    expect(honeypot).toHaveAttribute("name", "website");
    expect(honeypot).toHaveAttribute("tabindex", "-1");
  });
});
