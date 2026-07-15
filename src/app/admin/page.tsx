import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getAllProjects } from "@/db/queries";
import { Badge } from "@/components/ui/badge";
import { AddProjectForm } from "./add-project-form";
import { PublishToggle } from "./publish-toggle";

/**
 * Protected admin dashboard (Slice 4). `requireAdmin()` is the authoritative
 * resource-layer authZ gate — it re-runs `auth()` + the allowlist server-side
 * and redirects anyone who isn't an allowlisted admin, independently of
 * middleware.
 *
 * `force-dynamic` because this route reads the session (cookies) per request
 * and lists live DB state; it must never be statically cached — the public
 * timeline (`/`) stays static/ISR.
 */
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await requireAdmin();
  const projects = await getAllProjects();

  return (
    <main className="mx-auto max-w-3xl space-y-10 p-8">
      <header className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">Admin</h1>
          <Link
            href="/admin/dashboard"
            className="text-sm font-medium underline-offset-4 hover:underline"
          >
            Engagement →
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">
          Signed in as {session.user?.email}.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Add a project</h2>
        <AddProjectForm />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">
          Projects{" "}
          <span className="text-sm font-normal text-muted-foreground">
            ({projects.length})
          </span>
        </h2>
        {projects.length === 0 ? (
          <p className="text-sm text-muted-foreground">No projects yet.</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {projects.map((project) => {
              const published = project.status === "published";
              return (
                <li
                  key={project.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-4"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{project.title}</span>
                      <Badge variant={published ? "default" : "secondary"}>
                        {project.status}
                      </Badge>
                      {project.previewType ? (
                        <Badge variant="secondary">{project.previewType}</Badge>
                      ) : null}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {project.githubOwner && project.githubRepo
                        ? `${project.githubOwner}/${project.githubRepo}`
                        : project.githubUrl}
                    </p>
                  </div>
                  <PublishToggle id={project.id} published={published} />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
