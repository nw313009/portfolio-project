const formatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function formatIsoDate(isoDate: string): string {
  return formatter.format(new Date(`${isoDate}T00:00:00Z`));
}

/** Renders "Mar 2021 - Aug 2021", or "Jun 2024 - Present" for an ongoing project. */
export function formatDateRange(
  startDate: string,
  endDate: string | null | undefined,
): string {
  const start = formatIsoDate(startDate);
  if (endDate == null) return `${start} - Present`;
  return `${start} - ${formatIsoDate(endDate)}`;
}
