import type { ReactNode } from "react";
import { BookOpen, ExternalLink, FileJson } from "lucide-react";
import type { Preview } from "@/lib/project-schema";

type CliPreview = Extract<Preview, { previewType: "cli" }>;
type ServicePreview = Extract<Preview, { previewType: "service" }>;
type LibraryPreview = Extract<Preview, { previewType: "library" }>;
type NotebookPreview = Extract<Preview, { previewType: "notebook" }>;
type MediaPreview = Extract<Preview, { previewType: "media" }>;

function ExternalTextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline"
    >
      {children}
      <ExternalLink className="size-3.5" aria-hidden="true" />
    </a>
  );
}

/** A terminal recording. Never an iframe: a self-hosted video if we have one, else a link to the cast. */
export function CliPreview({ preview, title }: { preview: CliPreview; title: string }) {
  if (preview.videoUrl) {
    return (
      <video
        src={preview.videoUrl}
        poster={preview.poster}
        controls
        className="aspect-video w-full rounded-md bg-muted"
      >
        <track kind="captions" />
      </video>
    );
  }

  return (
    <div
      className="flex aspect-video flex-col items-center justify-center gap-2 rounded-md bg-muted bg-cover bg-center p-4 text-center text-sm text-muted-foreground"
      style={preview.poster ? { backgroundImage: `url(${preview.poster})` } : undefined}
    >
      <p>{title} - terminal recording</p>
      {/* `cliPreview` requires a castUrl when there's no videoUrl (see project-schema.ts). */}
      <ExternalTextLink href={preview.castUrl!}>Watch the recording</ExternalTextLink>
    </div>
  );
}

/** An API's sample payload, shown as code - never an iframe. */
export function ServicePreview({ preview }: { preview: ServicePreview }) {
  return (
    <div className="space-y-2">
      <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs">
        <code>{preview.sample}</code>
      </pre>
      {preview.openApiUrl ? (
        <ExternalTextLink href={preview.openApiUrl}>
          <FileJson className="size-3.5" aria-hidden="true" />
          View OpenAPI spec
        </ExternalTextLink>
      ) : null}
    </div>
  );
}

/** A library's usage snippet, shown as code - never an iframe. */
export function LibraryPreview({ preview }: { preview: LibraryPreview }) {
  return (
    <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs">
      <code>{preview.codeSnippet}</code>
    </pre>
  );
}

/** A notebook's rendered output image, with a link to the full notebook - never an iframe. */
export function NotebookPreview({ preview, title }: { preview: NotebookPreview; title: string }) {
  return (
    <div className="space-y-2">
      {/* eslint-disable-next-line @next/next/no-img-element -- local/remote content-authored asset path, not a Next.js-optimizable static import */}
      <img
        src={preview.outputImageUrl}
        alt={`${title} notebook output`}
        className="w-full rounded-md bg-muted object-cover"
      />
      <ExternalTextLink href={preview.notebookUrl}>
        <BookOpen className="size-3.5" aria-hidden="true" />
        Open notebook
      </ExternalTextLink>
    </div>
  );
}

/** A gallery of screenshots/media - never an iframe. */
export function MediaPreview({ preview, title }: { preview: MediaPreview; title: string }) {
  return (
    <ul className="flex gap-2 overflow-x-auto" aria-label={`${title} screenshots`}>
      {preview.images.map((image) => (
        <li key={image} className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element -- local/remote content-authored asset path, not a Next.js-optimizable static import */}
          <img
            src={image}
            alt={`${title} screenshot`}
            className="h-40 rounded-md bg-muted object-cover"
          />
        </li>
      ))}
    </ul>
  );
}
