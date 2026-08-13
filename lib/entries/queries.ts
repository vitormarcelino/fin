import "server-only";

import { and, asc, desc, eq, gte, inArray, lt, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { entryTags, financialEntries, tags, type FinancialEntry, type Tag } from "@/lib/db/schema";
import { monthDateRange } from "@/lib/utils/date";
import type { EntryClassification, EntryType } from "@/lib/entries/schema";

export type EntryWithTags = FinancialEntry & { tags: Tag[] };

export type EntryFilters = {
  month?: string;
  type?: EntryType;
  classification?: EntryClassification;
  tagId?: string;
  status?: "PENDING" | "PAID";
  /** "dateDesc" (default): most recent first. "dueDateAsc": due date
   *  ascending — Postgres sorts NULLs last on ASC, so undated entries fall
   *  to the end instead of the front. */
  sort?: "dateDesc" | "dueDateAsc";
};

async function attachTags(userId: string, entries: FinancialEntry[]): Promise<EntryWithTags[]> {
  if (entries.length === 0) return [];

  const entryIds = entries.map((e) => e.id);
  const rows = await db
    .select({ entryId: entryTags.entryId, tag: tags })
    .from(entryTags)
    .innerJoin(tags, eq(entryTags.tagId, tags.id))
    .where(and(inArray(entryTags.entryId, entryIds), eq(tags.userId, userId)));

  const tagsByEntry = new Map<string, Tag[]>();
  for (const row of rows) {
    const list = tagsByEntry.get(row.entryId) ?? [];
    list.push(row.tag);
    tagsByEntry.set(row.entryId, list);
  }

  return entries.map((entry) => ({
    ...entry,
    tags: tagsByEntry.get(entry.id) ?? [],
  }));
}

/** All entries for a user matching the given filters, most recent first. Always scoped by userId. */
export async function getEntries(userId: string, filters: EntryFilters = {}): Promise<EntryWithTags[]> {
  const conditions: SQL[] = [eq(financialEntries.userId, userId)];

  if (filters.month) {
    const { start, end } = monthDateRange(filters.month);
    conditions.push(gte(financialEntries.date, start), lt(financialEntries.date, end));
  }
  if (filters.type) {
    conditions.push(eq(financialEntries.type, filters.type));
  }
  if (filters.classification) {
    conditions.push(eq(financialEntries.classification, filters.classification));
  }
  if (filters.tagId) {
    conditions.push(
      inArray(
        financialEntries.id,
        db.select({ id: entryTags.entryId }).from(entryTags).where(eq(entryTags.tagId, filters.tagId)),
      ),
    );
  }
  if (filters.status) {
    conditions.push(eq(financialEntries.status, filters.status));
  }

  const orderBy =
    filters.sort === "dueDateAsc"
      ? [asc(financialEntries.dueDate), desc(financialEntries.date)]
      : [desc(financialEntries.date), desc(financialEntries.createdAt)];

  const rows = await db
    .select()
    .from(financialEntries)
    .where(and(...conditions))
    .orderBy(...orderBy);

  return attachTags(userId, rows);
}

/** A single entry, only if it belongs to the given user. */
export async function getEntryById(userId: string, id: string): Promise<EntryWithTags | null> {
  const rows = await db
    .select()
    .from(financialEntries)
    .where(and(eq(financialEntries.id, id), eq(financialEntries.userId, userId)))
    .limit(1);

  const entry = rows[0];
  if (!entry) return null;

  const [withTags] = await attachTags(userId, [entry]);
  return withTags;
}
