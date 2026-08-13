/**
 * Pure aggregation logic for the monthly dashboard — no I/O, easy to unit
 * test. Takes the raw per-(type, classification) totals from
 * `getMonthAggregates` and reduces them into current/previous month
 * summaries plus the deltas between them.
 */
import type { EntryClassification, EntryType } from "@/lib/entries/schema";

export type MonthAggRow = {
  type: EntryType;
  classification: EntryClassification;
  currentCents: number;
  previousCents: number;
};

export type MonthTotals = {
  incomeCents: number;
  expenseCents: number;
  balanceCents: number;
  fixedIncomeCents: number;
  variableIncomeCents: number;
  fixedExpenseCents: number;
  variableExpenseCents: number;
};

export type MonthComparison = {
  current: MonthTotals;
  previous: MonthTotals;
  deltas: {
    incomeCents: number;
    expenseCents: number;
    balanceCents: number;
  };
};

function emptyTotals(): MonthTotals {
  return {
    incomeCents: 0,
    expenseCents: 0,
    balanceCents: 0,
    fixedIncomeCents: 0,
    variableIncomeCents: 0,
    fixedExpenseCents: 0,
    variableExpenseCents: 0,
  };
}

function accumulate(totals: MonthTotals, type: EntryType, classification: EntryClassification, cents: number) {
  if (cents === 0) return;
  if (type === "INCOME") {
    totals.incomeCents += cents;
    if (classification === "FIXED") totals.fixedIncomeCents += cents;
    else totals.variableIncomeCents += cents;
  } else {
    totals.expenseCents += cents;
    if (classification === "FIXED") totals.fixedExpenseCents += cents;
    else totals.variableExpenseCents += cents;
  }
}

/** Reduces raw aggregate rows into full current/previous totals and deltas. */
export function calcMonthComparison(rows: MonthAggRow[]): MonthComparison {
  const current = emptyTotals();
  const previous = emptyTotals();

  for (const row of rows) {
    accumulate(current, row.type, row.classification, row.currentCents);
    accumulate(previous, row.type, row.classification, row.previousCents);
  }

  current.balanceCents = current.incomeCents - current.expenseCents;
  previous.balanceCents = previous.incomeCents - previous.expenseCents;

  return {
    current,
    previous,
    deltas: {
      incomeCents: current.incomeCents - previous.incomeCents,
      expenseCents: current.expenseCents - previous.expenseCents,
      balanceCents: current.balanceCents - previous.balanceCents,
    },
  };
}

// --- Trend chart (income vs expense over the last N months) ---

export type MonthlyTypeTotal = { month: string; type: EntryType; totalCents: number };

export type TrendMonthTotals = { month: string; incomeCents: number; expenseCents: number };

/** Fills every month in `months` (in order) with its income/expense totals, defaulting to 0. */
export function buildTrendSeries(rows: MonthlyTypeTotal[], months: string[]): TrendMonthTotals[] {
  const byMonth = new Map<string, TrendMonthTotals>(
    months.map((month) => [month, { month, incomeCents: 0, expenseCents: 0 }]),
  );

  for (const row of rows) {
    const entry = byMonth.get(row.month);
    if (!entry) continue; // outside the requested range, ignore
    if (row.type === "INCOME") entry.incomeCents += row.totalCents;
    else entry.expenseCents += row.totalCents;
  }

  return months.map((month) => byMonth.get(month)!);
}

// --- Fixed vs. variable chart ---

export type FixedVariablePoint = { category: "Despesas" | "Receitas"; fixedCents: number; variableCents: number };

/** Derived from an already-computed MonthTotals — no extra query needed. */
export function buildFixedVariablePoints(current: MonthTotals): FixedVariablePoint[] {
  return [
    { category: "Despesas", fixedCents: current.fixedExpenseCents, variableCents: current.variableExpenseCents },
    { category: "Receitas", fixedCents: current.fixedIncomeCents, variableCents: current.variableIncomeCents },
  ];
}
