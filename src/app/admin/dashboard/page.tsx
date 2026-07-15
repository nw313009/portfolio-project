import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getAllProjects, getEventAggregates } from "@/db/queries";

/**
 * Protected engagement dashboard (Slice 5). `requireAdmin()` is the FIRST
 * statement — the authoritative resource-layer authZ gate re-runs `auth()` +
 * the allowlist server-side and redirects anyone who isn't an allowlisted
 * admin, independently of (bypassable) middleware.
 *
 * `force-dynamic` because it reads the session per request and live aggregate
 * DB state; it must never be statically cached. The public timeline (`/`) stays
 * static/ISR.
 *
 * Shows AGGREGATE counts only — never identity. Distinct ephemeral session ids
 * are reported as "Sessions", NEVER "unique visitors": a session id is a
 * per-page-load correlation id, not a person.
 */
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await requireAdmin();

  const [aggregates, projects] = await Promise.all([
    getEventAggregates(),
    getAllProjects(),
  ]);

  const titleById = new Map(projects.map((project) => [project.id, project.title]));

  return (
    <main className="mx-auto max-w-4xl space-y-10 p-8">
      <header className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">Engagement</h1>
          <Link
            href="/admin"
            className="text-sm font-medium underline-offset-4 hover:underline"
          >
            ← Admin
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">
          Anonymous, aggregate counts. No visitor identity is collected.
        </p>
      </header>

      <section
        aria-label="Summary"
        className="grid grid-cols-2 gap-4 sm:grid-cols-4"
      >
        <SummaryCard label="Total events" value={aggregates.totalEvents} />
        <SummaryCard label="Last 7 days" value={aggregates.recentCount} />
        <SummaryCard label="Sessions" value={aggregates.sessions} />
        <SummaryCard label="Views" value={aggregates.totalsByType.view} />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">By project</h2>
        {aggregates.perProject.length === 0 ? (
          <p className="text-sm text-muted-foreground">No events recorded yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <caption className="sr-only">
                Engagement counts per project
              </caption>
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th scope="col" className="p-3 font-medium">
                    Project
                  </th>
                  <th scope="col" className="p-3 text-right font-medium">
                    Views
                  </th>
                  <th scope="col" className="p-3 text-right font-medium">
                    Preview opened
                  </th>
                  <th scope="col" className="p-3 text-right font-medium">
                    Demo clicks
                  </th>
                  <th scope="col" className="p-3 text-right font-medium">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {aggregates.perProject.map((row) => (
                  <tr key={row.projectId}>
                    <th scope="row" className="p-3 text-left font-normal">
                      {titleById.get(row.projectId) ?? row.projectId}
                    </th>
                    <td className="p-3 text-right tabular-nums">{row.view}</td>
                    <td className="p-3 text-right tabular-nums">{row.hover}</td>
                    <td className="p-3 text-right tabular-nums">{row.demoOpen}</td>
                    <td className="p-3 text-right font-medium tabular-nums">
                      {row.total}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
