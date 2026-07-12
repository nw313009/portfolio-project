import type { Preview } from "@/lib/project-schema";
import { WebappPreview } from "./webapp-preview";
import {
  CliPreview,
  LibraryPreview,
  MediaPreview,
  NotebookPreview,
  ServicePreview,
} from "./simple-previews";

interface ProjectPreviewProps {
  preview: Preview;
  title: string;
}

/**
 * Switches on `previewType`. Only `webapp` ever becomes a live `<iframe>`;
 * every other variant renders its own media/snippet. The `default` case
 * assigns to a `never` type, so adding a new `previewType` to the schema
 * without handling it here is a compile error.
 */
export function ProjectPreview({ preview, title }: ProjectPreviewProps) {
  switch (preview.previewType) {
    case "webapp":
      return <WebappPreview demoUrl={preview.demoUrl} poster={preview.poster} title={title} />;
    case "cli":
      return <CliPreview preview={preview} title={title} />;
    case "service":
      return <ServicePreview preview={preview} />;
    case "library":
      return <LibraryPreview preview={preview} />;
    case "notebook":
      return <NotebookPreview preview={preview} title={title} />;
    case "media":
      return <MediaPreview preview={preview} title={title} />;
    default: {
      const exhaustiveCheck: never = preview;
      return exhaustiveCheck;
    }
  }
}
