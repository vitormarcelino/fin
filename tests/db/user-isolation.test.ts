import { beforeEach, describe, expect, it } from "vitest";
import { getEntries, getEntryById } from "@/lib/entries/queries";
import { listTags } from "@/lib/tags/queries";
import { getExpenseByTag, getMonthAggregates, getSixMonthTypeTotals } from "@/lib/dashboard/queries";
import { createTestUser, db, entryTags, financialEntries, tags, truncateAll } from "@/tests/db-helpers";

beforeEach(async () => {
  await truncateAll();
});

async function seedEntry(userId: string, overrides: Partial<typeof financialEntries.$inferInsert> = {}) {
  const [row] = await db
    .insert(financialEntries)
    .values({
      userId,
      type: "EXPENSE",
      classification: "VARIABLE",
      description: "seed",
      amountCents: 1000,
      date: "2026-08-05",
      ...overrides,
    })
    .returning();
  return row;
}

describe("entries isolation", () => {
  it("getEntries never returns another user's entries", async () => {
    const alice = await createTestUser({ username: "alice" });
    const bob = await createTestUser({ username: "bob" });
    await seedEntry(alice.id, { description: "alice entry" });
    await seedEntry(bob.id, { description: "bob entry" });

    const aliceEntries = await getEntries(alice.id);
    expect(aliceEntries).toHaveLength(1);
    expect(aliceEntries[0].description).toBe("alice entry");

    const bobEntries = await getEntries(bob.id);
    expect(bobEntries).toHaveLength(1);
    expect(bobEntries[0].description).toBe("bob entry");
  });

  it("getEntryById returns null when the entry belongs to a different user", async () => {
    const alice = await createTestUser({ username: "alice2" });
    const bob = await createTestUser({ username: "bob2" });
    const entry = await seedEntry(alice.id);

    expect(await getEntryById(alice.id, entry.id)).not.toBeNull();
    expect(await getEntryById(bob.id, entry.id)).toBeNull();
  });

  it("month filter combined with userId does not leak across users in the same month", async () => {
    const alice = await createTestUser({ username: "alice3" });
    const bob = await createTestUser({ username: "bob3" });
    await seedEntry(alice.id, { date: "2026-08-10" });
    await seedEntry(bob.id, { date: "2026-08-11" });

    const aliceAug = await getEntries(alice.id, { month: "2026-08" });
    expect(aliceAug).toHaveLength(1);
    expect(aliceAug[0].userId).toBe(alice.id);
  });
});

describe("tags isolation", () => {
  it("listTags never returns another user's tags", async () => {
    const alice = await createTestUser({ username: "alice4" });
    const bob = await createTestUser({ username: "bob4" });
    await db.insert(tags).values({ userId: alice.id, name: "Alice tag" });
    await db.insert(tags).values({ userId: bob.id, name: "Bob tag" });

    const aliceTags = await listTags(alice.id);
    expect(aliceTags).toHaveLength(1);
    expect(aliceTags[0].name).toBe("Alice tag");
  });

  it("a tag filter never surfaces entries tagged only via another user's identical tag id space", async () => {
    const alice = await createTestUser({ username: "alice5" });
    const bob = await createTestUser({ username: "bob5" });
    const [aliceTag] = await db.insert(tags).values({ userId: alice.id, name: "Mercado" }).returning();
    const aliceEntry = await seedEntry(alice.id, { description: "alice tagged" });
    await db.insert(entryTags).values({ entryId: aliceEntry.id, tagId: aliceTag.id });

    const bobResults = await getEntries(bob.id, { tagId: aliceTag.id });
    expect(bobResults).toHaveLength(0);
  });
});

describe("dashboard queries isolation", () => {
  it("getMonthAggregates only sums the requesting user's entries", async () => {
    const alice = await createTestUser({ username: "alice6" });
    const bob = await createTestUser({ username: "bob6" });
    await seedEntry(alice.id, { type: "INCOME", classification: "FIXED", amountCents: 500_00, date: "2026-08-01" });
    await seedEntry(bob.id, { type: "INCOME", classification: "FIXED", amountCents: 999_00, date: "2026-08-01" });

    const rows = await getMonthAggregates(alice.id, "2026-08");
    const incomeFixed = rows.find((r) => r.type === "INCOME" && r.classification === "FIXED");
    expect(incomeFixed?.currentCents).toBe(500_00);
  });

  it("getSixMonthTypeTotals only sums the requesting user's entries", async () => {
    const alice = await createTestUser({ username: "alice7" });
    const bob = await createTestUser({ username: "bob7" });
    await seedEntry(alice.id, { type: "EXPENSE", amountCents: 100_00, date: "2026-08-01" });
    await seedEntry(bob.id, { type: "EXPENSE", amountCents: 900_00, date: "2026-08-01" });

    const rows = await getSixMonthTypeTotals(alice.id, "2026-08");
    const total = rows.filter((r) => r.month === "2026-08" && r.type === "EXPENSE").reduce((sum, r) => sum + r.totalCents, 0);
    expect(total).toBe(100_00);
  });

  it("getExpenseByTag only sums the requesting user's entries", async () => {
    const alice = await createTestUser({ username: "alice8" });
    const bob = await createTestUser({ username: "bob8" });
    const [aliceTag] = await db.insert(tags).values({ userId: alice.id, name: "Casa" }).returning();
    const aliceEntry = await seedEntry(alice.id, { type: "EXPENSE", amountCents: 200_00, date: "2026-08-01" });
    await db.insert(entryTags).values({ entryId: aliceEntry.id, tagId: aliceTag.id });
    await seedEntry(bob.id, { type: "EXPENSE", amountCents: 900_00, date: "2026-08-01" });

    const slices = await getExpenseByTag(alice.id, "2026-08");
    const totalForAlice = slices.reduce((sum, s) => sum + s.totalCents, 0);
    expect(totalForAlice).toBe(200_00);
  });
});
