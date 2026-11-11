import { addMonths, isValidMonthString, monthsBetween } from "@/lib/utils/date";

export const PERIOD_PRESETS = [3, 6, 12, 24] as const;
export const DEFAULT_PERIOD = 12;
export const MAX_CUSTOM_MONTHS = 60;

export type HistoryRange = { from: string; to: string; preset: number | null };

export type HistoryEntry = {
  id: string;
  date: string;
  dueDate: string | null;
  amountCents: number | null;
  status: "PENDING" | "PAID";
};

export type MonthPoint = {
  month: string;
  amountCents: number | null;
  status: "PENDING" | "PAID" | null;
};

export type HistorySummary = {
  totalCents: number;
  averageCents: number;
  maxCents: number | null;
  minCents: number | null;
  paidCount: number;
  pendingCount: number;
  unconfirmedCount: number;
  lastPaid: HistoryEntry | null;
  firstToLastDeltaCents: number | null;
};

export function resolveHistoryRange(
  params: { months?: string; from?: string; to?: string },
  currentMonth: string,
  defaultPeriod: number = DEFAULT_PERIOD,
): HistoryRange {
  const { from, to } = params;
  if (from && to && isValidMonthString(from) && isValidMonthString(to)) {
    const [start, end] = from <= to ? [from, to] : [to, from];
    const clampedStart = monthsBetween(start, end) > MAX_CUSTOM_MONTHS ? addMonths(end, -(MAX_CUSTOM_MONTHS - 1)) : start;
    return { from: clampedStart, to: end, preset: null };
  }
  const parsed = Number(params.months);
  const preset = (PERIOD_PRESETS as readonly number[]).includes(parsed) ? parsed : defaultPeriod;
  return { from: addMonths(currentMonth, -(preset - 1)), to: currentMonth, preset };
}

export function monthsInRange(from: string, to: string): string[] {
  const months: string[] = [];
  for (let m = from; m <= to; m = addMonths(m, 1)) months.push(m);
  return months;
}

export function buildMonthlySeries(entries: HistoryEntry[], months: string[]): MonthPoint[] {
  const byMonth = new Map<string, MonthPoint>();
  for (const entry of entries) {
    const month = entry.date.slice(0, 7);
    const existing = byMonth.get(month);
    const amount = entry.amountCents;
    if (!existing) {
      byMonth.set(month, { month, amountCents: amount, status: entry.status });
      continue;
    }
    existing.amountCents =
      existing.amountCents === null && amount === null ? null : (existing.amountCents ?? 0) + (amount ?? 0);
    if (entry.status === "PENDING") existing.status = "PENDING";
  }
  return months.map((month) => byMonth.get(month) ?? { month, amountCents: null, status: null });
}

export function summarizeHistory(entries: HistoryEntry[], series: MonthPoint[]): HistorySummary {
  const confirmed = series.filter((p): p is MonthPoint & { amountCents: number } => p.amountCents !== null);
  const totalCents = confirmed.reduce((sum, p) => sum + p.amountCents, 0);
  const amounts = confirmed.map((p) => p.amountCents);
  const lastPaid =
    [...entries]
      .filter((e) => e.status === "PAID")
      .sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;

  return {
    totalCents,
    averageCents: confirmed.length > 0 ? Math.round(totalCents / confirmed.length) : 0,
    maxCents: amounts.length > 0 ? Math.max(...amounts) : null,
    minCents: amounts.length > 0 ? Math.min(...amounts) : null,
    paidCount: entries.filter((e) => e.status === "PAID").length,
    pendingCount: entries.filter((e) => e.status === "PENDING").length,
    unconfirmedCount: entries.filter((e) => e.amountCents === null).length,
    lastPaid,
    firstToLastDeltaCents:
      confirmed.length >= 2 ? confirmed[confirmed.length - 1].amountCents - confirmed[0].amountCents : null,
  };
}
