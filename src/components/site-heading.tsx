interface SiteHeadingProps {
  title: string;
  subtitle?: string;
}

export function SiteHeading({ title, subtitle }: SiteHeadingProps) {
  return (
    <header className="flex flex-col items-center gap-2 text-center">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        {title}
      </h1>
      {subtitle ? (
        <p className="text-muted-foreground max-w-prose text-balance">
          {subtitle}
        </p>
      ) : null}
    </header>
  );
}
