"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PREVIEW_TYPES } from "@/lib/project-schema";
import { ingestProject, type ActionResult } from "./actions";

/**
 * Minimal admin form to ingest a project from a GitHub repo URL. Submits to the
 * `ingestProject` server action via `useActionState`; the action enforces
 * `requireAdmin()`, validates, fetches GitHub metadata, and persists a DRAFT.
 */
export function AddProjectForm() {
  const [state, formAction, pending] = useActionState<
    ActionResult | null,
    FormData
  >(ingestProject, null);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="repoUrl">GitHub repo URL</Label>
        <Input
          id="repoUrl"
          name="repoUrl"
          type="text"
          required
          placeholder="https://github.com/owner/repo"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="demoUrl">Demo URL (optional, https)</Label>
        <Input
          id="demoUrl"
          name="demoUrl"
          type="url"
          placeholder="https://demo.example.com"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="previewType">Preview type</Label>
        <Select name="previewType" defaultValue="webapp">
          <SelectTrigger id="previewType" className="w-full">
            <SelectValue placeholder="Select a preview type" />
          </SelectTrigger>
          <SelectContent>
            {PREVIEW_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="title">Title (optional, overrides repo name)</Label>
        <Input id="title" name="title" type="text" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="summary">Summary (optional, overrides description)</Label>
        <Input id="summary" name="summary" type="text" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="startDate">
          Timeline date (optional, defaults to repo creation date)
        </Label>
        <Input id="startDate" name="startDate" type="date" />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Adding..." : "Add project"}
      </Button>

      {state && !state.ok ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      {state?.ok ? (
        <p role="status" className="text-sm text-primary">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
