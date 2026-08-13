import { describe, expect, it } from "vitest";
import {
  buildFixedVariablePoints,
  buildTrendSeries,
  calcMonthComparison,
  type MonthAggRow,
} from "@/lib/dashboard/calc";

describe("calcMonthComparison", () => {
  it("sums income/expense and computes balance for the current month", () => {
    const rows: MonthAggRow[] = [
      { type: "INCOME", classification: "FIXED", currentCents: 500000, previousCents: 500000 },
      { type: "INCOME", classification: "VARIABLE", currentCents: 20000, previousCents: 0 },
      { type: "EXPENSE", classification: "FIXED", currentCents: 150000, previousCents: 150000 },
      { type: "EXPENSE", classification: "VARIABLE", currentCents: 30000, previousCents: 60000 },
    ];

    const result = calcMonthComparison(rows);

    expect(result.current).toEqual({
      incomeCents: 520000,
      expenseCents: 180000,
      balanceCents: 340000,
      fixedIncomeCents: 500000,
      variableIncomeCents: 20000,
      fixedExpenseCents: 150000,
      variableExpenseCents: 30000,
    });
  });

  it("computes deltas as current minus previous", () => {
    const rows: MonthAggRow[] = [
      { type: "INCOME", classification: "FIXED", currentCents: 500000, previousCents: 500000 },
      { type: "EXPENSE", classification: "VARIABLE", currentCents: 30000, previousCents: 60000 },
    ];

    const result = calcMonthComparison(rows);

    expect(result.deltas).toEqual({
      incomeCents: 0,
      expenseCents: -30000,
      balanceCents: 30000, // expenses dropped, balance improved by the same amount
    });
  });

  it("handles an empty previous month without throwing and without polluting current totals", () => {
    const rows: MonthAggRow[] = [
      { type: "INCOME", classification: "VARIABLE", currentCents: 10000, previousCents: 0 },
    ];

    const result = calcMonthComparison(rows);

    expect(result.previous).toEqual({
      incomeCents: 0,
      expenseCents: 0,
      balanceCents: 0,
      fixedIncomeCents: 0,
      variableIncomeCents: 0,
      fixedExpenseCents: 0,
      variableExpenseCents: 0,
    });
    expect(result.current.incomeCents).toBe(10000);
  });

  it("returns all-zero totals for no rows at all", () => {
    const result = calcMonthComparison([]);
    expect(result.current.balanceCents).toBe(0);
    expect(result.previous.balanceCents).toBe(0);
    expect(result.deltas).toEqual({ incomeCents: 0, expenseCents: 0, balanceCents: 0 });
  });

  it("computes a negative balance when expenses exceed income", () => {
    const rows: MonthAggRow[] = [
      { type: "INCOME", classification: "FIXED", currentCents: 10000, previousCents: 0 },
      { type: "EXPENSE", classification: "VARIABLE", currentCents: 25000, previousCents: 0 },
    ];
    expect(calcMonthComparison(rows).current.balanceCents).toBe(-15000);
  });
});

describe("buildTrendSeries", () => {
  it("fills every requested month, defaulting missing ones to zero", () => {
    const months = ["2026-06", "2026-07", "2026-08"];
    const rows = [
      { month: "2026-07", type: "INCOME" as const, totalCents: 1000 },
      { month: "2026-08", type: "EXPENSE" as const, totalCents: 400 },
    ];

    expect(buildTrendSeries(rows, months)).toEqual([
      { month: "2026-06", incomeCents: 0, expenseCents: 0 },
      { month: "2026-07", incomeCents: 1000, expenseCents: 0 },
      { month: "2026-08", incomeCents: 0, expenseCents: 400 },
    ]);
  });

  it("preserves the given month order regardless of row order", () => {
    const months = ["2026-08", "2026-06", "2026-07"];
    const result = buildTrendSeries([], months);
    expect(result.map((r) => r.month)).toEqual(months);
  });

  it("ignores rows for months outside the requested range", () => {
    const months = ["2026-08"];
    const rows = [{ month: "2020-01", type: "INCOME" as const, totalCents: 999 }];
    expect(buildTrendSeries(rows, months)).toEqual([{ month: "2026-08", incomeCents: 0, expenseCents: 0 }]);
  });

  it("accumulates multiple rows of the same type in the same month", () => {
    const months = ["2026-08"];
    const rows = [
      { month: "2026-08", type: "INCOME" as const, totalCents: 100 },
      { month: "2026-08", type: "INCOME" as const, totalCents: 250 },
    ];
    expect(buildTrendSeries(rows, months)[0].incomeCents).toBe(350);
  });
});

describe("buildFixedVariablePoints", () => {
  it("derives the two chart categories from a MonthTotals without a DB round-trip", () => {
    const current = {
      incomeCents: 520000,
      expenseCents: 180000,
      balanceCents: 340000,
      fixedIncomeCents: 500000,
      variableIncomeCents: 20000,
      fixedExpenseCents: 150000,
      variableExpenseCents: 30000,
    };

    expect(buildFixedVariablePoints(current)).toEqual([
      { category: "Despesas", fixedCents: 150000, variableCents: 30000 },
      { category: "Receitas", fixedCents: 500000, variableCents: 20000 },
    ]);
  });
});
