import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { tags } from "@/lib/db/schema";
import { isUniqueViolation } from "@/lib/db/errors";

/**
 * Resolves the final set of tag ids to link to an entry (or recurring
 * entry): the given existing tagIds plus one row per newTagNames entry,
 * upserted case-insensitively against the user's existing tags so retyping
 * an existing name never creates a duplicate.
 */
export async function resolveTagIds(
  userId: string,
  tagIds: string[],
  newTagNames: string[],
): Promise<string[]> {
  const resolved = new Set(tagIds);
  if (newTagNames.length === 0) return [...resolved];

  const uniqueNames = [...new Set(newTagNames.map((n) => n.trim()).filter(Boolean))];

  const existing = await db
    .select()
    .from(tags)
    .where(
      and(
        eq(tags.userId, userId),
        inArray(sql`lower(${tags.name})`, uniqueNames.map((n) => n.toLowerCase())),
      ),
    );
  const existingByLowerName = new Map(existing.map((t) => [t.name.toLowerCase(), t]));

  for (const name of uniqueNames) {
    const found = existingByLowerName.get(name.toLowerCase());
    if (found) {
      resolved.add(found.id);
      continue;
    }
    try {
      const [created] = await db.insert(tags).values({ userId, name }).returning();
      resolved.add(created.id);
    } catch (err) {
      // Race with a concurrent insert of the same name — look it up instead.
      if (isUniqueViolation(err)) {
        const [race] = await db
          .select()
          .from(tags)
          .where(and(eq(tags.userId, userId), sql`lower(${tags.name}) = ${name.toLowerCase()}`))
          .limit(1);
        if (race) resolved.add(race.id);
      } else {
        throw err;
      }
    }
  }

  return [...resolved];
}
