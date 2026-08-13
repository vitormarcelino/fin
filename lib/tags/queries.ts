import "server-only";

import { eq, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { tags } from "@/lib/db/schema";

/** All tags belonging to a user, alphabetically. Always scoped by userId. */
export async function listTags(userId: string) {
  return db
    .select()
    .from(tags)
    .where(eq(tags.userId, userId))
    .orderBy(asc(tags.name));
}
