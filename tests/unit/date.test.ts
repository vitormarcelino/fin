import { describe, expect, it, vi } from "vitest";
import {
  addDays,
  addMonths,
  clampDayToMonth,
  formatDateLabel,
  formatMonthLabel,
  formatMonthShortLabel,
  isValidMonthString,
  monthDateRange,
  todayInTimeZone,
} from "@/lib/utils/date";

describe("isValidMonthString", () => {
  it("accepts a well-formed month", () => {
    expect(isValidMonthString("2026-08")).toBe(true);
  });

  it("rejects month 00 and month 13", () => {
    expect(isValidMonthString("2026-00")).toBe(false);
    expect(isValidMonthString("2026-13")).toBe(false);
  });

  it("rejects malformed strings", () => {
    expect(isValidMonthString("2026-8")).toBe(false);
    expect(isValidMonthString("not-a-month")).toBe(false);
    expect(isValidMonthString("")).toBe(false);
  });
});

describe("addMonths", () => {
  it("adds within the same year", () => {
    expect(addMonths("2026-03", 2)).toBe("2026-05");
  });

  it("rolls over December to January", () => {
    expect(addMonths("2025-12", 1)).toBe("2026-01");
  });

  it("rolls back January to the previous December", () => {
    expect(addMonths("2026-01", -1)).toBe("2025-12");
  });

  it("handles multi-year jumps", () => {
    expect(addMonths("2026-06", -18)).toBe("2024-12");
  });

  it("is a no-op for delta 0", () => {
    expect(addMonths("2026-08", 0)).toBe("2026-08");
  });
});

describe("monthDateRange", () => {
  it("returns [first-of-month, first-of-next-month)", () => {
    expect(monthDateRange("2026-08")).toEqual({ start: "2026-08-01", end: "2026-09-01" });
  });

  it("rolls the end date over a year boundary for December", () => {
    expect(monthDateRange("2025-12")).toEqual({ start: "2025-12-01", end: "2026-01-01" });
  });
});

describe("formatMonthLabel", () => {
  it("formats and capitalizes a pt-BR month/year label", () => {
    expect(formatMonthLabel("2026-08")).toBe("Agosto de 2026");
  });
});

describe("formatMonthShortLabel", () => {
  it("formats a short pt-BR month label with no trailing dot", () => {
    const label = formatMonthShortLabel("2026-08");
    expect(label).not.toContain(".");
    expect(label.length).toBeGreaterThan(0);
  });
});

describe("formatDateLabel", () => {
  it("formats an ISO date as dd/mm/yyyy", () => {
    expect(formatDateLabel("2026-08-05")).toBe("05/08/2026");
  });
});

describe("addDays", () => {
  it("adds within the same month", () => {
    expect(addDays("2026-08-10", 5)).toBe("2026-08-15");
  });

  it("rolls over a month boundary", () => {
    expect(addDays("2026-08-28", 5)).toBe("2026-09-02");
  });

  it("rolls over a year boundary", () => {
    expect(addDays("2025-12-30", 5)).toBe("2026-01-04");
  });

  it("supports negative deltas", () => {
    expect(addDays("2026-08-02", -5)).toBe("2026-07-28");
  });

  it("is a no-op for delta 0", () => {
    expect(addDays("2026-08-13", 0)).toBe("2026-08-13");
  });
});

describe("todayInTimeZone", () => {
  it("returns a well-formed YYYY-MM-DD matching an equivalent Intl computation", () => {
    const expected = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    expect(todayInTimeZone("America/Sao_Paulo")).toBe(expected);
    expect(todayInTimeZone("America/Sao_Paulo")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("can disagree with UTC's date near the day boundary", () => {
    // America/Sao_Paulo is behind UTC, so a fixed instant close to UTC
    // midnight still falls on the previous day in Brazil.
    const utcMidnight = new Date("2026-08-05T01:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(utcMidnight);
    try {
      expect(todayInTimeZone("UTC")).toBe("2026-08-05");
      expect(todayInTimeZone("America/Sao_Paulo")).toBe("2026-08-04");
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("clampDayToMonth", () => {
  it("keeps an in-range day unchanged", () => {
    expect(clampDayToMonth("2026-08", 15)).toBe("2026-08-15");
  });

  it("clamps day 31 to the 28th in a non-leap February", () => {
    expect(clampDayToMonth("2026-02", 31)).toBe("2026-02-28");
  });

  it("clamps day 31 to the 29th in a leap February", () => {
    expect(clampDayToMonth("2024-02", 31)).toBe("2024-02-29");
  });

  it("clamps day 31 to the 30th in April", () => {
    expect(clampDayToMonth("2026-04", 31)).toBe("2026-04-30");
  });

  it("keeps day 30 unchanged in a 30-day month", () => {
    expect(clampDayToMonth("2026-04", 30)).toBe("2026-04-30");
  });
});
