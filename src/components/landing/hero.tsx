"use client";

import Link from "next/link";
import { useEffect, useRef, type CSSProperties } from "react";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

interface HeroProps {
  name: string;
  role: string;
  tagline: string;
}

/**
 * Landing hero. The design concept IS the interaction: a dark, subtly-textured
 * band where a warm "firelight" spotlight follows the cursor and reveals the
 * texture beneath it (a radial-gradient mask positioned by `--mx`/`--my`).
 *
 * Performance/accessibility: the pointer position is written straight to CSS
 * custom properties via a ref (never React state, so no re-render per move), and
 * under `prefers-reduced-motion` no listener is attached — the spotlight simply
 * rests at a fixed, pleasant position.
 */
export function Hero({ name, role, tagline }: HeroProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const section = sectionRef.current;
    if (!section) return;

    function handlePointerMove(event: PointerEvent) {
      const rect = section!.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      section!.style.setProperty("--mx", `${x}%`);
      section!.style.setProperty("--my", `${y}%`);
    }

    section.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => section.removeEventListener("pointermove", handlePointerMove);
  }, [prefersReducedMotion]);

  return (
    <section
      ref={sectionRef}
      className="relative isolate flex min-h-[calc(100vh-3.5rem)] items-center overflow-hidden bg-zinc-950 text-zinc-50"
      style={{ "--mx": "50%", "--my": "38%" } as CSSProperties}
    >
      {/* Texture layer: a faint dot grid, mostly hidden until the spotlight
          reveals it. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.12) 1px, transparent 0)",
          backgroundSize: "22px 22px",
          maskImage:
            "radial-gradient(420px circle at var(--mx) var(--my), black 0%, transparent 70%)",
          WebkitMaskImage:
            "radial-gradient(420px circle at var(--mx) var(--my), black 0%, transparent 70%)",
        }}
      />
      {/* Warm firelight glow following the cursor. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(600px circle at var(--mx) var(--my), rgba(255,146,48,0.18), transparent 60%)",
        }}
      />

      <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-20 sm:px-6">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-amber-400/90">
          {name} · {role}
        </p>
        <h1 className="max-w-3xl font-heading text-4xl font-semibold leading-tight tracking-tight text-balance sm:text-6xl">
          {tagline}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Link
            href="/projects"
            className="inline-flex h-11 items-center justify-center rounded-md bg-amber-500 px-6 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
          >
            View projects
          </Link>
          <Link
            href="/skills"
            className="inline-flex h-11 items-center justify-center rounded-md px-6 text-sm font-semibold text-zinc-100 ring-1 ring-zinc-700 transition hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
          >
            Explore skills
          </Link>
        </div>
      </div>
    </section>
  );
}
