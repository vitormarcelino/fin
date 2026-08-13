import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  recurringEntries,
  recurringEntryTags,
  tags,
  type RecurringEntry,
  type Tag,
} from "@/lib/db/schema";

export type RecurringEntryWithTags = RecurringEntry & { tags: Tag[] };

async function attachTags(
  userId: string,
  entries: RecurringEntry[],
): Promise<RecurringEntryWithTags[]> {
  if (entries.length === 0) return [];

  const ids = entries.map((e) => e.id);
  const rows = await db
    .select({ recurringEntryId: recurringEntryTags.recurringEntryId, tag: tags })
    .from(recurringEntryTags)
    .innerJoin(tags, eq(recurringEntryTags.tagId, tags.id))
    .where(and(inArray(recurringEntryTags.recurringEntryId, ids), eq(tags.userId, userId)));

  const tagsByEntry = new Map<string, Tag[]>();
  for (const row of rows) {
    const list = tagsByEntry.get(row.recurringEntryId) ?? [];
    list.push(row.tag);
    tagsByEntry.set(row.recurringEntryId, list);
  }

  return entries.map((entry) => ({
    ...entry,
    tags: tagsByEntry.get(entry.id) ?? [],
  }));
}

/** All recurring templates belonging to a user, newest first. Always scoped by userId. */
export async function listRecurringEntries(userId: string): Promise<RecurringEntryWithTags[]> {
  const rows = await db
    .select()
    .from(recurringEntries)
    .where(eq(recurringEntries.userId, userId))
    .orderBy(asc(recurringEntries.description));

  return attachTags(userId, rows);
}

/** A single recurring template, only if it belongs to the given user. */
export async function getRecurringEntryById(
  userId: string,
  id: string,
): Promise<RecurringEntryWithTags | null> {
  const rows = await db
    .select()
    .from(recurringEntries)
    .where(and(eq(recurringEntries.id, id), eq(recurringEntries.userId, userId)))
    .limit(1);

  const entry = rows[0];
  if (!entry) return null;

  const [withTags] = await attachTags(userId, [entry]);
  return withTags;
}

/** Active recurring templates for a user — the ones generation should consider. */
export async function listActiveRecurringEntries(
  userId: string,
): Promise<RecurringEntryWithTags[]> {
  const rows = await db
    .select()
    .from(recurringEntries)
    .where(and(eq(recurringEntries.userId, userId), eq(recurringEntries.active, true)));

  return attachTags(userId, rows);
}
