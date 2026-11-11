import { describe, expect, it } from "vitest";
import { buildClassificationSeries, calcMonthlyAverages, type MonthTotals } from "@/lib/dashboard/calc";

const totals = (income: number, expense: number): MonthTotals => ({
  incomeCents: income,
  expenseCents: expense,
  balanceCents: income - expense,
  fixedIncomeCents: 0,
  variableIncomeCents: 0,
  fixedExpenseCents: 0,
  variableExpenseCents: 0,
});

describe("calcMonthlyAverages", () => {
  it("divides totals by month count and rounds to cents", () => {
    expect(calcMonthlyAverages(totals(1000, 400), 3)).toEqual({
      incomeCents: 333,
      expenseCents: 133,
      balanceCents: 200,
    });
  });

  it("returns zeros for an empty period", () => {
    expect(calcMonthlyAverages(totals(1000, 400), 0)).toEqual({ incomeCents: 0, expenseCents: 0, balanceCents: 0 });
  });
});

describe("buildClassificationSeries", () => {
  it("fills every month and splits fixed from variable", () => {
    expect(
      buildClassificationSeries(
        [
          { month: "2026-01", classification: "FIXED", totalCents: 100 },
          { month: "2026-01", classification: "VARIABLE", totalCents: 50 },
          { month: "2026-03", classification: "VARIABLE", totalCents: 70 },
          { month: "2025-12", classification: "FIXED", totalCents: 999 },
        ],
        ["2026-01", "2026-02", "2026-03"],
      ),
    ).toEqual([
      { month: "2026-01", fixedCents: 100, variableCents: 50 },
      { month: "2026-02", fixedCents: 0, variableCents: 0 },
      { month: "2026-03", fixedCents: 0, variableCents: 70 },
    ]);
  });
});
