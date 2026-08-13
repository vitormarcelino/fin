import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { getEntries } from "@/lib/entries/queries";
import { deleteTag } from "@/lib/tags/actions";
import { createSession, setSessionCookie } from "@/lib/auth/session";
import { __resetMockCookies } from "@/tests/mocks/next-headers";
import { createTestUser, db, entryTags, financialEntries, tags, truncateAll } from "@/tests/db-helpers";

async function loginAs(userId: string) {
  const { token, expiresAt } = await createSession(userId);
  await setSessionCookie(token, expiresAt);
}

beforeEach(async () => {
  await truncateAll();
  __resetMockCookies();
});

describe("getEntries tagId filter", () => {
  it("returns only entries linked to the given tag", async () => {
    const user = await createTestUser();
    const [mercado] = await db.insert(tags).values({ userId: user.id, name: "Mercado" }).returning();
    const [lazer] = await db.insert(tags).values({ userId: user.id, name: "Lazer" }).returning();

    const [tagged] = await db
      .insert(financialEntries)
      .values({ userId: user.id, type: "EXPENSE", classification: "VARIABLE", description: "Supermercado", amountCents: 5000, date: "2026-08-01" })
      .returning();
    await db.insert(financialEntries).values({ userId: user.id, type: "EXPENSE", classification: "VARIABLE", description: "Cinema", amountCents: 3000, date: "2026-08-02" });
    await db.insert(entryTags).values({ entryId: tagged.id, tagId: mercado.id });

    const results = await getEntries(user.id, { tagId: mercado.id });
    expect(results).toHaveLength(1);
    expect(results[0].description).toBe("Supermercado");

    const lazerResults = await getEntries(user.id, { tagId: lazer.id });
    expect(lazerResults).toHaveLength(0);
  });
});

describe("deleteTag", () => {
  it("removes the tag and its entry_tags links but preserves the underlying entry", async () => {
    const user = await createTestUser();
    await loginAs(user.id);

    const [tag] = await db.insert(tags).values({ userId: user.id, name: "Mercado" }).returning();
    const [entry] = await db
      .insert(financialEntries)
      .values({ userId: user.id, type: "EXPENSE", classification: "VARIABLE", description: "Supermercado", amountCents: 5000, date: "2026-08-01" })
      .returning();
    await db.insert(entryTags).values({ entryId: entry.id, tagId: tag.id });

    await deleteTag(tag.id);

    const remainingTags = await db.select().from(tags).where(eq(tags.id, tag.id));
    expect(remainingTags).toHaveLength(0);

    const remainingLinks = await db.select().from(entryTags).where(eq(entryTags.tagId, tag.id));
    expect(remainingLinks).toHaveLength(0);

    const [stillThere] = await db.select().from(financialEntries).where(eq(financialEntries.id, entry.id));
    expect(stillThere).toBeDefined();
    expect(stillThere.description).toBe("Supermercado");
  });

  it("does not delete another user's tag", async () => {
    const owner = await createTestUser({ username: "owner3" });
    const attacker = await createTestUser({ username: "attacker3" });
    const [tag] = await db.insert(tags).values({ userId: owner.id, name: "Mercado" }).returning();

    await loginAs(attacker.id);
    await deleteTag(tag.id);

    const stillThere = await db.select().from(tags).where(eq(tags.id, tag.id));
    expect(stillThere).toHaveLength(1);
  });
});
