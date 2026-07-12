import { describe, it, expect, vi, afterEach } from "vitest";
import { act, render, screen, fireEvent } from "@testing-library/react";
import { WebappPreview } from "./webapp-preview";

afterEach(() => {
  vi.useRealTimers();
});

describe("WebappPreview", () => {
  it("renders an idle state with a Preview button and no iframe", () => {
    render(<WebappPreview demoUrl="https://example.com" title="Demo" />);
    expect(screen.getByRole("button", { name: /preview demo/i })).toBeInTheDocument();
    expect(screen.queryByTitle("Demo demo")).not.toBeInTheDocument();
  });

  it("mounts the iframe with a sandbox attribute when the button is clicked", () => {
    render(<WebappPreview demoUrl="https://example.com" title="Demo" />);
    fireEvent.click(screen.getByRole("button", { name: /preview demo/i }));
    const iframe = screen.getByTitle("Demo demo");
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute("src", "https://example.com");
    expect(iframe).toHaveAttribute("sandbox");
  });

  it("does not mount the iframe on a brief hover (hover intent)", () => {
    vi.useFakeTimers();
    render(<WebappPreview demoUrl="https://example.com" title="Demo" />);
    const container = screen.getByRole("button", { name: /preview demo/i }).parentElement!;
    fireEvent.mouseEnter(container);
    fireEvent.mouseLeave(container);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.queryByTitle("Demo demo")).not.toBeInTheDocument();
  });

  it("mounts the iframe after sustained hover past the intent delay", () => {
    vi.useFakeTimers();
    render(<WebappPreview demoUrl="https://example.com" title="Demo" />);
    const container = screen.getByRole("button", { name: /preview demo/i }).parentElement!;
    fireEvent.mouseEnter(container);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByTitle("Demo demo")).toBeInTheDocument();
  });

  it("shows an 'Open demo' fallback link once the iframe loads", () => {
    render(<WebappPreview demoUrl="https://example.com" title="Demo" />);
    fireEvent.click(screen.getByRole("button", { name: /preview demo/i }));
    fireEvent.load(screen.getByTitle("Demo demo"));
    expect(screen.getByRole("link", { name: /open demo/i })).toHaveAttribute(
      "href",
      "https://example.com",
    );
  });

  it("falls back to a link if the iframe never fires load within the timeout", () => {
    vi.useFakeTimers();
    render(<WebappPreview demoUrl="https://example.com" title="Demo" />);
    fireEvent.click(screen.getByRole("button", { name: /preview demo/i }));
    act(() => {
      vi.advanceTimersByTime(7000);
    });
    expect(screen.queryByTitle("Demo demo")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open demo/i })).toHaveAttribute(
      "href",
      "https://example.com",
    );
  });
});
