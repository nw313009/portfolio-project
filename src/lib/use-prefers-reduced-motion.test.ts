import { describe, it, expect, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

type Listener = (event: MediaQueryListEvent) => void;

function mockMatchMedia(initialMatches: boolean) {
  let matches = initialMatches;
  const listeners = new Set<Listener>();

  window.matchMedia = (query: string): MediaQueryList => ({
    get matches() {
      return matches;
    },
    media: query,
    onchange: null,
    addEventListener: (_event: string, listener: EventListenerOrEventListenerObject) => {
      listeners.add(listener as Listener);
    },
    removeEventListener: (_event: string, listener: EventListenerOrEventListenerObject) => {
      listeners.delete(listener as Listener);
    },
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });

  return {
    setMatches(next: boolean) {
      matches = next;
      for (const listener of listeners) {
        listener({ matches: next } as MediaQueryListEvent);
      }
    },
  };
}

const originalMatchMedia = window.matchMedia;

afterEach(() => {
  window.matchMedia = originalMatchMedia;
});

describe("usePrefersReducedMotion", () => {
  it("reads the current preference on mount", () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(true);
  });

  it("defaults to false when the preference is not set", () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);
  });

  it("reacts to a live change in the preference", () => {
    const media = mockMatchMedia(false);
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);

    act(() => {
      media.setMatches(true);
    });

    expect(result.current).toBe(true);
  });
});
