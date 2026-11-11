import { describe, expect, it } from "vitest";
import {
  buildMonthlySeries,
  monthsInRange,
  resolveHistoryRange,
  summarizeHistory,
  type HistoryEntry,
} from "@/lib/recurring/history";

const entry = (date: string, amountCents: number | null, status: "PAID" | "PENDING" = "PAID"): HistoryEntry => ({
  id: date,
  date,
  dueDate: date,
  amountCents,
  status,
});

describe("resolveHistoryRange", () => {
  it("defaults to the last 12 months", () => {
    expect(resolveHistoryRange({}, "2026-11")).toEqual({ from: "2025-12", to: "2026-11", preset: 12 });
  });

  it("uses a valid preset", () => {
    expect(resolveHistoryRange({ months: "3" }, "2026-02")).toEqual({ from: "2025-12", to: "2026-02", preset: 3 });
  });

  it("falls back to default for an unknown preset", () => {
    expect(resolveHistoryRange({ months: "7" }, "2026-11").preset).toBe(12);
  });

  it("accepts a custom range and swaps reversed bounds", () => {
    expect(resolveHistoryRange({ from: "2026-05", to: "2026-01" }, "2026-11")).toEqual({
      from: "2026-01",
      to: "2026-05",
      preset: null,
    });
  });

  it("ignores an invalid custom range", () => {
    expect(resolveHistoryRange({ from: "2026-13", to: "2026-01" }, "2026-11").preset).toBe(12);
  });
});

describe("monthsInRange", () => {
  it("crosses year boundaries", () => {
    expect(monthsInRange("2025-11", "2026-02")).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
  });
});

describe("buildMonthlySeries", () => {
  it("fills missing months and merges entries within a month", () => {
    const series = buildMonthlySeries(
      [entry("2026-01-10", 1000), entry("2026-03-10", 2000), entry("2026-03-20", 500, "PENDING")],
      ["2026-01", "2026-02", "2026-03"],
    );
    expect(series).toEqual([
      { month: "2026-01", amountCents: 1000, status: "PAID" },
      { month: "2026-02", amountCents: null, status: null },
      { month: "2026-03", amountCents: 2500, status: "PENDING" },
    ]);
  });
});

describe("summarizeHistory", () => {
  it("computes totals, averages and last payment ignoring unconfirmed amounts", () => {
    const entries = [
      entry("2026-03-10", null, "PENDING"),
      entry("2026-02-10", 3000),
      entry("2026-01-10", 1000),
    ];
    const series = buildMonthlySeries(entries, ["2026-01", "2026-02", "2026-03"]);
    const summary = summarizeHistory(entries, series);

    expect(summary).toMatchObject({
      totalCents: 4000,
      averageCents: 2000,
      maxCents: 3000,
      minCents: 1000,
      paidCount: 2,
      pendingCount: 1,
      unconfirmedCount: 1,
      firstToLastDeltaCents: 2000,
    });
    expect(summary.lastPaid?.date).toBe("2026-02-10");
  });

  it("handles an empty history", () => {
    const summary = summarizeHistory([], buildMonthlySeries([], ["2026-01"]));
    expect(summary).toMatchObject({ totalCents: 0, averageCents: 0, maxCents: null, lastPaid: null });
  });
});

describe("resolveHistoryRange options", () => {
  it("accepts a custom default period", () => {
    expect(resolveHistoryRange({}, "2026-11", 6)).toEqual({ from: "2026-06", to: "2026-11", preset: 6 });
  });

  it("clamps very long custom ranges to 60 months", () => {
    expect(resolveHistoryRange({ from: "2000-01", to: "2026-12" }, "2026-11").from).toBe("2022-01");
  });
});
