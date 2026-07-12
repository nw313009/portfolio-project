"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

/**
 * Toggles between light and dark. Renders a static placeholder until
 * mounted: `next-themes`' `theme` value is `undefined` during server
 * rendering (it only knows the real preference once the client reads
 * localStorage/`prefers-color-scheme`), so rendering the sun/moon icon
 * before that would either flash the wrong icon or mismatch what the
 * server sent - see the linked next-themes docs pattern.
 */
export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        type="button"
        aria-hidden="true"
        disabled
        className="inline-flex size-9 items-center justify-center rounded-md ring-1 ring-border"
      />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className="inline-flex size-9 items-center justify-center rounded-md text-foreground ring-1 ring-border transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {isDark ? <Sun className="size-4" aria-hidden="true" /> : <Moon className="size-4" aria-hidden="true" />}
    </button>
  );
}
