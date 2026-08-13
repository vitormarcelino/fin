import "server-only";

import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { entryTags, financialEntries, tags } from "@/lib/db/schema";
import { addMonths, monthDateRange } from "@/lib/utils/date";
import type { MonthAggRow, MonthlyTypeTotal } from "@/lib/dashboard/calc";

/**
 * Totals per (type, classification) for `month` and the month immediately
 * before it, in a single round trip via conditional SUM...FILTER per
 * period — avoids two separate queries for the month-over-month comparison.
 * Always scoped by userId.
 */
export async function getMonthAggregates(userId: string, month: string): Promise<MonthAggRow[]> {
  const previousMonth = addMonths(month, -1);
  const current = monthDateRange(month);
  const previous = monthDateRange(previousMonth);

  const rows = await db
    .select({
      type: financialEntries.type,
      classification: financialEntries.classification,
      currentCents: sql<string>`coalesce(sum(${financialEntries.amountCents}) filter (
        where ${financialEntries.date} >= ${current.start} and ${financialEntries.date} < ${current.end}
      ), 0)`,
      previousCents: sql<string>`coalesce(sum(${financialEntries.amountCents}) filter (
        where ${financialEntries.date} >= ${previous.start} and ${financialEntries.date} < ${previous.end}
      ), 0)`,
    })
    .from(financialEntries)
    .where(
      and(
        eq(financialEntries.userId, userId),
        sql`${financialEntries.date} >= ${previous.start} and ${financialEntries.date} < ${current.end}`,
      ),
    )
    .groupBy(financialEntries.type, financialEntries.classification);

  return rows.map((row) => ({
    type: row.type,
    classification: row.classification,
    currentCents: Number(row.currentCents),
    previousCents: Number(row.previousCents),
  }));
}

/**
 * Totals per (type, classification) for the 6 months ending in `month`
 * (inclusive) vs. the 6 months immediately before that — same shape and
 * same single-round-trip FILTER technique as `getMonthAggregates`, just
 * with 6-month windows instead of single months. Feeds the "Geral"
 * overview page's period-over-period comparison via the same
 * `calcMonthComparison` reducer used for the monthly dashboard. Always
 * scoped by userId.
 */
export async function getSixMonthComparison(userId: string, month: string): Promise<MonthAggRow[]> {
  const current = { start: monthDateRange(addMonths(month, -5)).start, end: monthDateRange(month).end };
  const previous = {
    start: monthDateRange(addMonths(month, -11)).start,
    end: monthDateRange(addMonths(month, -6)).end,
  };

  const rows = await db
    .select({
      type: financialEntries.type,
      classification: financialEntries.classification,
      currentCents: sql<string>`coalesce(sum(${financialEntries.amountCents}) filter (
        where ${financialEntries.date} >= ${current.start} and ${financialEntries.date} < ${current.end}
      ), 0)`,
      previousCents: sql<string>`coalesce(sum(${financialEntries.amountCents}) filter (
        where ${financialEntries.date} >= ${previous.start} and ${financialEntries.date} < ${previous.end}
      ), 0)`,
    })
    .from(financialEntries)
    .where(
      and(
        eq(financialEntries.userId, userId),
        sql`${financialEntries.date} >= ${previous.start} and ${financialEntries.date} < ${current.end}`,
      ),
    )
    .groupBy(financialEntries.type, financialEntries.classification);

  return rows.map((row) => ({
    type: row.type,
    classification: row.classification,
    currentCents: Number(row.currentCents),
    previousCents: Number(row.previousCents),
  }));
}

/**
 * Per-month, per-type totals covering the 6 months ending in `month`
 * (inclusive) — feeds the income vs. expense trend chart. Always scoped by
 * userId.
 */
export async function getSixMonthTypeTotals(userId: string, month: string): Promise<MonthlyTypeTotal[]> {
  const start = monthDateRange(addMonths(month, -5)).start;
  const end = monthDateRange(month).end;
  const monthExpr = sql<string>`to_char(date_trunc('month', ${financialEntries.date}), 'YYYY-MM')`;

  const rows = await db
    .select({
      month: monthExpr,
      type: financialEntries.type,
      totalCents: sql<string>`sum(${financialEntries.amountCents})`,
    })
    .from(financialEntries)
    .where(
      and(eq(financialEntries.userId, userId), gte(financialEntries.date, start), lt(financialEntries.date, end)),
    )
    .groupBy(monthExpr, financialEntries.type);

  return rows.map((row) => ({ month: row.month, type: row.type, totalCents: Number(row.totalCents) }));
}

export type TagExpenseSlice = { tagId: string | null; tagName: string; totalCents: number };

/**
 * Expense totals by tag for `month`, largest first, plus a synthetic
 * "Sem tag" bucket for expenses with no tags at all. Always scoped by
 * userId. Thin wrapper over `getExpenseByTagRange` for the single-month
 * case used by the monthly dashboard.
 */
export async function getExpenseByTag(userId: string, month: string): Promise<TagExpenseSlice[]> {
  const { start, end } = monthDateRange(month);
  return getExpenseByTagRange(userId, start, end);
}

/**
 * Expense totals by tag over an arbitrary [start, end) date range, largest
 * first, plus a synthetic "Sem tag" bucket for expenses with no tags at
 * all. Always scoped by userId. Used directly by the "Geral" overview page
 * to aggregate tags across several months at once.
 */
export async function getExpenseByTagRange(userId: string, start: string, end: string): Promise<TagExpenseSlice[]> {
  const tagged = await db
    .select({
      tagId: tags.id,
      tagName: tags.name,
      totalCents: sql<string>`sum(${financialEntries.amountCents})`,
    })
    .from(financialEntries)
    .innerJoin(entryTags, eq(entryTags.entryId, financialEntries.id))
    .innerJoin(tags, eq(entryTags.tagId, tags.id))
    .where(
      and(
        eq(financialEntries.userId, userId),
        eq(financialEntries.type, "EXPENSE"),
        gte(financialEntries.date, start),
        lt(financialEntries.date, end),
      ),
    )
    .groupBy(tags.id, tags.name)
    .orderBy(desc(sql`sum(${financialEntries.amountCents})`));

  const [untagged] = await db
    .select({ totalCents: sql<string>`coalesce(sum(${financialEntries.amountCents}), 0)` })
    .from(financialEntries)
    .where(
      and(
        eq(financialEntries.userId, userId),
        eq(financialEntries.type, "EXPENSE"),
        gte(financialEntries.date, start),
        lt(financialEntries.date, end),
        sql`not exists (select 1 from ${entryTags} where ${entryTags.entryId} = ${financialEntries.id})`,
      ),
    );

  const slices: TagExpenseSlice[] = tagged.map((row) => ({
    tagId: row.tagId,
    tagName: row.tagName,
    totalCents: Number(row.totalCents),
  }));

  const untaggedCents = Number(untagged?.totalCents ?? 0);
  if (untaggedCents > 0) {
    slices.push({ tagId: null, tagName: "Sem tag", totalCents: untaggedCents });
  }

  return slices;
}
