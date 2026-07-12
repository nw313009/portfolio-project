import { describe, it, expect } from "vitest";
import { formatDateRange } from "@/lib/format-date-range";

describe("formatDateRange", () => {
  it("formats a closed date range", () => {
    expect(formatDateRange("2021-03-01", "2021-08-15")).toBe("Mar 2021 - Aug 2021");
  });

  it("formats an ongoing project as Present when endDate is null", () => {
    expect(formatDateRange("2024-06-01", null)).toBe("Jun 2024 - Present");
  });

  it("treats a missing endDate the same as null", () => {
    expect(formatDateRange("2024-06-01", undefined)).toBe("Jun 2024 - Present");
  });
});
