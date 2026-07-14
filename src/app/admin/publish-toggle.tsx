"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { setPublished, type ActionResult } from "./actions";

/**
 * A one-button form that flips a project between draft and published via the
 * `setPublished` server action (which re-checks `requireAdmin()` and busts the
 * public timeline's ISR cache).
 */
export function PublishToggle({
  id,
  published,
}: {
  id: string;
  published: boolean;
}) {
  const [state, formAction, pending] = useActionState<
    ActionResult | null,
    FormData
  >(setPublished, null);

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="publish" value={String(!published)} />
      <Button
        type="submit"
        size="sm"
        variant={published ? "outline" : "default"}
        disabled={pending}
      >
        {published ? "Unpublish" : "Publish"}
      </Button>
      {state && !state.ok ? (
        <span role="alert" className="text-xs text-destructive">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}
