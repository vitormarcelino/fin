import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { ensureRecurringEntriesForMonth } from "@/lib/recurring/generate";
import {
  createTestUser,
  db,
  entryTags,
  financialEntries,
  recurringEntries,
  recurringEntryTags,
  tags,
  truncateAll,
} from "@/tests/db-helpers";

beforeEach(async () => {
  await truncateAll();
});

async function seedTemplate(
  userId: string,
  overrides: Partial<typeof recurringEntries.$inferInsert> = {},
) {
  const [row] = await db
    .insert(recurringEntries)
    .values({
      userId,
      type: "EXPENSE",
      description: "Cartão de Crédito XXX",
      amountCents: null,
      dueDay: 20,
      active: true,
      createdAt: new Date("2026-01-01T00:00:00Z"),
      ...overrides,
    })
    .returning();
  return row;
}

async function generatedEntries(recurringEntryId: string) {
  return db
    .select()
    .from(financialEntries)
    .where(eq(financialEntries.recurringEntryId, recurringEntryId));
}

describe("ensureRecurringEntriesForMonth", () => {
  it("is idempotent — calling twice for the same month never duplicates", async () => {
    const user = await createTestUser();
    const template = await seedTemplate(user.id, { amountCents: 5000 });

    await ensureRecurringEntriesForMonth(user.id, "2026-08");
    await ensureRecurringEntriesForMonth(user.id, "2026-08");

    const rows = await generatedEntries(template.id);
    expect(rows).toHaveLength(1);
  });

  it("copies the fixed amount onto the generated instance", async () => {
    const user = await createTestUser();
    const template = await seedTemplate(user.id, { amountCents: 12345 });

    await ensureRecurringEntriesForMonth(user.id, "2026-08");

    const [row] = await generatedEntries(template.id);
    expect(row.amountCents).toBe(12345);
    expect(row.classification).toBe("FIXED");
    expect(row.date).toBe("2026-08-20");
    expect(row.dueDate).toBe("2026-08-20");
    expect(row.status).toBe("PENDING");
  });

  it("generates a pending (null amount, no due date for income) instance for a variable-amount template", async () => {
    const user = await createTestUser();
    const template = await seedTemplate(user.id, {
      type: "INCOME",
      amountCents: null,
      dueDay: 5,
    });

    await ensureRecurringEntriesForMonth(user.id, "2026-08");

    const [row] = await generatedEntries(template.id);
    expect(row.amountCents).toBeNull();
    expect(row.dueDate).toBeNull();
    expect(row.date).toBe("2026-08-05");
  });

  it("clamps dueDay to the last valid day of shorter months", async () => {
    const user = await createTestUser();
    const template = await seedTemplate(user.id, { dueDay: 31, amountCents: 100 });

    await ensureRecurringEntriesForMonth(user.id, "2026-02");

    const [row] = await generatedEntries(template.id);
    expect(row.date).toBe("2026-02-28");
  });

  it("snapshots the template's tags onto the generated instance", async () => {
    const user = await createTestUser();
    const [tagA] = await db.insert(tags).values({ userId: user.id, name: "Casa" }).returning();
    const template = await seedTemplate(user.id, { amountCents: 100 });
    await db.insert(recurringEntryTags).values({ recurringEntryId: template.id, tagId: tagA.id });

    await ensureRecurringEntriesForMonth(user.id, "2026-08");
    const [augEntry] = await generatedEntries(template.id);
    const augTagLinks = await db.select().from(entryTags).where(eq(entryTags.entryId, augEntry.id));
    expect(augTagLinks.map((l) => l.tagId)).toEqual([tagA.id]);

    // Change the template's tags after the fact — already-generated
    // instances must not be retroactively affected.
    const [tagB] = await db.insert(tags).values({ userId: user.id, name: "Mercado" }).returning();
    await db.delete(recurringEntryTags).where(eq(recurringEntryTags.recurringEntryId, template.id));
    await db.insert(recurringEntryTags).values({ recurringEntryId: template.id, tagId: tagB.id });

    await ensureRecurringEntriesForMonth(user.id, "2026-09");
    const [augAfter] = await db.select().from(entryTags).where(eq(entryTags.entryId, augEntry.id));
    expect(augAfter.tagId).toBe(tagA.id);

    const [sepEntry] = (await generatedEntries(template.id)).filter((e) => e.date.startsWith("2026-09"));
    const sepTagLinks = await db.select().from(entryTags).where(eq(entryTags.entryId, sepEntry.id));
    expect(sepTagLinks.map((l) => l.tagId)).toEqual([tagB.id]);
  });

  it("never generates for a month before the template was created", async () => {
    const user = await createTestUser();
    const template = await seedTemplate(user.id, {
      amountCents: 100,
      createdAt: new Date("2026-03-15T00:00:00Z"),
    });

    await ensureRecurringEntriesForMonth(user.id, "2026-01");
    expect(await generatedEntries(template.id)).toHaveLength(0);

    await ensureRecurringEntriesForMonth(user.id, "2026-03");
    expect(await generatedEntries(template.id)).toHaveLength(1);
  });

  it("skips paused templates but leaves previously generated instances intact", async () => {
    const user = await createTestUser();
    const template = await seedTemplate(user.id, { amountCents: 100 });

    await ensureRecurringEntriesForMonth(user.id, "2026-08");
    expect(await generatedEntries(template.id)).toHaveLength(1);

    await db.update(recurringEntries).set({ active: false }).where(eq(recurringEntries.id, template.id));
    await ensureRecurringEntriesForMonth(user.id, "2026-09");

    const rows = await generatedEntries(template.id);
    expect(rows).toHaveLength(1);
    expect(rows[0].date).toBe("2026-08-20");
  });

  it("resumes generating once reactivated", async () => {
    const user = await createTestUser();
    const template = await seedTemplate(user.id, { amountCents: 100, active: false });

    await ensureRecurringEntriesForMonth(user.id, "2026-09");
    expect(await generatedEntries(template.id)).toHaveLength(0);

    await db.update(recurringEntries).set({ active: true }).where(eq(recurringEntries.id, template.id));
    await ensureRecurringEntriesForMonth(user.id, "2026-09");
    expect(await generatedEntries(template.id)).toHaveLength(1);
  });

  it("never generates entries for another user's templates", async () => {
    const alice = await createTestUser({ username: "alice-recurring" });
    const bob = await createTestUser({ username: "bob-recurring" });
    const aliceTemplate = await seedTemplate(alice.id, { amountCents: 100 });
    await seedTemplate(bob.id, { amountCents: 200 });

    await ensureRecurringEntriesForMonth(alice.id, "2026-08");

    const aliceRows = await generatedEntries(aliceTemplate.id);
    expect(aliceRows).toHaveLength(1);
    expect(aliceRows[0].userId).toBe(alice.id);

    const allEntries = await db.select().from(financialEntries);
    expect(allEntries).toHaveLength(1);
  });
});
