import "server-only";

import { and, eq, gte, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { entryTags, financialEntries } from "@/lib/db/schema";
import { clampDayToMonth, monthDateRange } from "@/lib/utils/date";
import { listActiveRecurringEntries } from "@/lib/recurring/queries";

/**
 * Materializes one `financial_entries` row per active recurring template for
 * the given month, if one doesn't already exist. Called lazily whenever a
 * user views a month (dashboard, entries list) — idempotent, so viewing the
 * same month twice never creates duplicates.
 *
 * A template never generates for a month before it was created (no
 * retroactive backfill), and a paused template (active: false) is skipped
 * entirely — instances it already generated are left untouched.
 */
export async function ensureRecurringEntriesForMonth(userId: string, month: string): Promise<void> {
  const templates = await listActiveRecurringEntries(userId);
  if (templates.length === 0) return;

  const { start, end } = monthDateRange(month);

  for (const template of templates) {
    const createdMonth = template.createdAt.toISOString().slice(0, 7);
    if (month < createdMonth) continue;

    const existing = await db
      .select({ id: financialEntries.id })
      .from(financialEntries)
      .where(
        and(
          eq(financialEntries.recurringEntryId, template.id),
          gte(financialEntries.date, start),
          lt(financialEntries.date, end),
        ),
      )
      .limit(1);
    if (existing.length > 0) continue;

    const date = clampDayToMonth(month, template.dueDay);

    const [created] = await db
      .insert(financialEntries)
      .values({
        userId,
        type: template.type,
        classification: "FIXED",
        description: template.description,
        amountCents: template.amountCents,
        date,
        dueDate: template.type === "EXPENSE" ? date : null,
        recurringEntryId: template.id,
        status: "PENDING",
      })
      .returning({ id: financialEntries.id });

    // Snapshot the template's tags onto this instance — editing the
    // template's tags later must not retroactively change past instances.
    if (template.tags.length > 0) {
      await db
        .insert(entryTags)
        .values(template.tags.map((tag) => ({ entryId: created.id, tagId: tag.id })));
    }
  }
}
