"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";

interface NavLink {
  href: string;
  label: string;
}

const NAV_LINKS: readonly NavLink[] = [
  { href: "/projects", label: "Projects" },
  { href: "/skills", label: "Skills" },
];

/**
 * Site-wide sticky header. The wordmark returns to the landing page (`/`); the
 * nav links are real routes (not client tabs) so each page keeps its own
 * rendering strategy and shareable URL. Active state is derived from
 * `usePathname`, treating a section and its descendants (e.g. `/projects` and a
 * future `/projects/[slug]`) as active.
 *
 * The trailing region intentionally leaves room for the Phase 3 opt-in guide
 * widget to mount beside the theme toggle without a layout change.
 */
export function SiteNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav
        aria-label="Primary"
        className="mx-auto flex h-14 w-full max-w-5xl items-center gap-6 px-4 sm:px-6"
      >
        <Link
          href="/"
          className="font-heading text-sm font-semibold tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {/* Placeholder wordmark — replace with your name. */}
          Writam
        </Link>

        <ul className="flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const isActive =
              pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={isActive ? "page" : undefined}
                  className={
                    isActive
                      ? "rounded-md px-3 py-1.5 text-sm font-medium text-foreground transition"
                      : "rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  }
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="ml-auto flex items-center gap-2">
          {/*
            Low-key, always-reachable contact path. Deep-links into the visitor
            card at the END of the timeline via the same `/projects#<anchor>`
            hash idiom the citation-scroll uses — no arrival modal, no second
            code path. Caveat by design: this lands past the timeline, since the
            reader asked for contact and got contact.
          */}
          <Link
            href="/projects#contact"
            className="rounded-md border border-border/60 px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:border-border hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Get in touch
          </Link>
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
