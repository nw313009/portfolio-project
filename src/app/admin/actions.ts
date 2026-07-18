"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  InvalidRepoUrlError,
  parseGithubRepoUrl,
} from "@/lib/github/parse-repo-url";
import { fetchRepoMetadata } from "@/lib/github/fetch-repo";
import { mapMetadataToProjectRow } from "@/lib/github/map-metadata";
import {
  DuplicateProjectError,
  ProjectNotFoundError,
  createProjectWithAudit,
  setProjectStatusWithAudit,
} from "@/db/queries";
import { PREVIEW_TYPES } from "@/lib/project-schema";

/**
 * Discriminated result for `useActionState`-driven admin forms. Both actions
 * call `requireAdmin()` as their FIRST statement — the authoritative
 * resource-layer authZ boundary — so a non-allowlisted principal is denied
 * (redirected) before any input parsing, GitHub call, or DB write.
 */
export type ActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

/** Normalize a FormData field to a trimmed non-empty string, else undefined. */
function field(value: FormDataEntryValue | null): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

const ingestSchema = z.object({
  repoUrl: z.string().min(1, "Repository URL is required."),
  demoUrl: z
    .url("Demo URL must be a valid URL.")
    .refine((value) => value.startsWith("https://"), {
      message: "Demo URL must use https.",
    })
    .optional(),
  previewType: z.enum(PREVIEW_TYPES),
  title: z.string().min(1).optional(),
  summary: z.string().min(1).optional(),
  startDate: z.iso.date("Timeline date must be an ISO date (YYYY-MM-DD).").optional(),
});

/**
 * Add a project from a pasted GitHub repo URL. Flow:
 *   requireAdmin -> Zod-validate input -> parse URL to owner/repo ->
 *   fetch api.github.com metadata (never the pasted URL) -> map to a DRAFT row
 *   -> createProjectWithAudit (project + audit_log in ONE Pool transaction).
 * Any GitHub/validation/duplicate/DB failure returns a clear error and creates
 * NO row (the transaction rolls back / is never entered).
 */
export async function ingestProject(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireAdmin();
  const actor = session.user?.email ?? "unknown";

  const parsed = ingestSchema.safeParse({
    repoUrl: field(formData.get("repoUrl")),
    demoUrl: field(formData.get("demoUrl")),
    previewType: field(formData.get("previewType")),
    title: field(formData.get("title")),
    summary: field(formData.get("summary")),
    startDate: field(formData.get("startDate")),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  let ref;
  try {
    ref = parseGithubRepoUrl(parsed.data.repoUrl);
  } catch (error) {
    if (error instanceof InvalidRepoUrlError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }

  const result = await fetchRepoMetadata(ref.owner, ref.repo);
  if (!result.ok) {
    return { ok: false, error: result.message };
  }

  const row = mapMetadataToProjectRow(result.metadata, {
    owner: ref.owner,
    repo: ref.repo,
    previewType: parsed.data.previewType,
    demoUrl: parsed.data.demoUrl ?? null,
    titleOverride: parsed.data.title ?? null,
    summaryOverride: parsed.data.summary ?? null,
    startDateOverride: parsed.data.startDate ?? null,
  });

  try {
    await createProjectWithAudit(row, actor);
  } catch (error) {
    if (error instanceof DuplicateProjectError) {
      return { ok: false, error: error.message };
    }
    console.error("Project ingestion DB write failed:", error);
    return { ok: false, error: "Could not save the project. Please try again." };
  }

  revalidatePath("/admin");
  return { ok: true, message: `Added ${ref.owner}/${ref.repo} as a draft.` };
}

/**
 * Publish or unpublish a project (flips `status`), audit-logged in a Pool
 * transaction. Busts the ISR cache on `/projects` (the public timeline) and
 * `/` (the landing's featured strip reads the same published set) so a newly
 * published project shows without a redeploy (on-demand revalidation was
 * deferred to this slice in Slice 2). `/projects` was added when the timeline
 * moved off `/` in the frontend transformation.
 */
export async function setPublished(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireAdmin();
  const actor = session.user?.email ?? "unknown";

  const id = field(formData.get("id"));
  const publish = formData.get("publish") === "true";
  if (!id) {
    return { ok: false, error: "Missing project id." };
  }

  try {
    await setProjectStatusWithAudit(id, publish ? "published" : "draft", actor);
  } catch (error) {
    if (error instanceof ProjectNotFoundError) {
      return { ok: false, error: error.message };
    }
    console.error("Publish toggle failed:", error);
    return { ok: false, error: "Could not update the project. Please try again." };
  }

  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath("/admin");
  return { ok: true, message: publish ? "Published." : "Unpublished." };
}
