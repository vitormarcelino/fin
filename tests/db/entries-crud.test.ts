import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createEntry, deleteEntry, toggleEntryStatus, updateEntry } from "@/lib/entries/actions";
import { getEntries, getEntryById } from "@/lib/entries/queries";
import { createSession, setSessionCookie } from "@/lib/auth/session";
import { __resetMockCookies } from "@/tests/mocks/next-headers";
import { createTestUser, db, entryTags, financialEntries, tags, truncateAll } from "@/tests/db-helpers";

async function loginAs(userId: string) {
  const { token, expiresAt } = await createSession(userId);
  await setSessionCookie(token, expiresAt);
}

function entryFormData(overrides: Record<string, string | string[]> = {}) {
  const fd = new FormData();
  const defaults: Record<string, string> = {
    type: "EXPENSE",
    classification: "VARIABLE",
    description: "Mercado",
    amount: "123,45",
    date: "2026-08-05",
    notes: "",
  };
  for (const [key, value] of Object.entries({ ...defaults, ...overrides })) {
    if (Array.isArray(value)) {
      for (const v of value) fd.append(key, v);
    } else {
      fd.set(key, value);
    }
  }
  if (overrides.tagIds && Array.isArray(overrides.tagIds)) {
    for (const v of overrides.tagIds) fd.append("tagIds", v);
  }
  if (overrides.newTagNames && Array.isArray(overrides.newTagNames)) {
    for (const v of overrides.newTagNames) fd.append("newTagNames", v);
  }
  return fd;
}

beforeEach(async () => {
  await truncateAll();
  __resetMockCookies();
});

describe("createEntry", () => {
  it("stores the amount as integer cents, not float", async () => {
    const user = await createTestUser();
    await loginAs(user.id);

    await expect(createEntry({}, entryFormData({ amount: "123,45" }))).rejects.toMatchObject({
      digest: expect.stringContaining("/entries"),
    });

    const [row] = await db.select().from(financialEntries).where(eq(financialEntries.userId, user.id));
    expect(row.amountCents).toBe(12345);
    expect(Number.isInteger(row.amountCents)).toBe(true);
  });

  it("rejects a zero/negative amount at the DB check constraint if ever bypassed", async () => {
    const user = await createTestUser();
    let caught: unknown;
    try {
      await db.insert(financialEntries).values({
        userId: user.id,
        type: "EXPENSE",
        classification: "VARIABLE",
        description: "bad",
        amountCents: 0,
        date: "2026-08-05",
      });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeDefined();
  });

  it("allows a null amount — a pending entry awaiting confirmation", async () => {
    const user = await createTestUser();
    const [row] = await db
      .insert(financialEntries)
      .values({
        userId: user.id,
        type: "EXPENSE",
        classification: "FIXED",
        description: "pending",
        amountCents: null,
        date: "2026-08-05",
      })
      .returning();
    expect(row.amountCents).toBeNull();
  });

  it("is always born 'PENDING', regardless of type", async () => {
    const user = await createTestUser();
    await loginAs(user.id);

    await expect(createEntry({}, entryFormData({ type: "EXPENSE" }))).rejects.toMatchObject({
      digest: expect.stringContaining("/entries"),
    });
    await expect(
      createEntry({}, entryFormData({ type: "INCOME", classification: "FIXED" })),
    ).rejects.toMatchObject({ digest: expect.stringContaining("/entries") });

    const rows = await db.select().from(financialEntries).where(eq(financialEntries.userId, user.id));
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.status === "PENDING")).toBe(true);
  });

  it("links newTagNames by upserting tags case-insensitively", async () => {
    const user = await createTestUser();
    await loginAs(user.id);

    await expect(
      createEntry({}, entryFormData({ newTagNames: ["Mercado", "mercado"] })),
    ).rejects.toMatchObject({ digest: expect.stringContaining("/entries") });

    const [row] = await db.select().from(financialEntries).where(eq(financialEntries.userId, user.id));
    const withTags = await getEntryById(user.id, row.id);
    expect(withTags?.tags).toHaveLength(1);
    expect(withTags?.tags[0].name).toBe("Mercado");
  });
});

describe("updateEntry ownership", () => {
  it("refuses to update another user's entry even with a known id", async () => {
    const owner = await createTestUser({ username: "owner" });
    const attacker = await createTestUser({ username: "attacker" });

    const [entry] = await db
      .insert(financialEntries)
      .values({ userId: owner.id, type: "EXPENSE", classification: "VARIABLE", description: "original", amountCents: 1000, date: "2026-08-01" })
      .returning();

    await loginAs(attacker.id);
    const result = await updateEntry(entry.id, {}, entryFormData({ description: "hacked" }));
    expect(result.error).toBeDefined();

    const [unchanged] = await db.select().from(financialEntries).where(eq(financialEntries.id, entry.id));
    expect(unchanged.description).toBe("original");
  });

  it("allows the owner to update their own entry", async () => {
    const owner = await createTestUser();
    const [entry] = await db
      .insert(financialEntries)
      .values({ userId: owner.id, type: "EXPENSE", classification: "VARIABLE", description: "original", amountCents: 1000, date: "2026-08-01" })
      .returning();

    await loginAs(owner.id);
    await expect(updateEntry(entry.id, {}, entryFormData({ description: "updated" }))).rejects.toMatchObject({
      digest: expect.stringContaining("/entries"),
    });

    const [updated] = await db.select().from(financialEntries).where(eq(financialEntries.id, entry.id));
    expect(updated.description).toBe("updated");
  });
});

describe("deleteEntry", () => {
  it("does not delete another user's entry even though it redirects as if it worked", async () => {
    const owner = await createTestUser({ username: "owner2" });
    const attacker = await createTestUser({ username: "attacker2" });

    const [entry] = await db
      .insert(financialEntries)
      .values({ userId: owner.id, type: "EXPENSE", classification: "VARIABLE", description: "keep me", amountCents: 500, date: "2026-08-01" })
      .returning();

    await loginAs(attacker.id);
    await expect(deleteEntry(entry.id)).rejects.toMatchObject({
      digest: expect.stringContaining("/entries"),
    });

    const stillThere = await getEntryById(owner.id, entry.id);
    expect(stillThere).not.toBeNull();
  });

  it("cascade-deletes entry_tags when the entry itself is deleted", async () => {
    const user = await createTestUser();
    const [tag] = await db.insert(financialEntries).values({
      userId: user.id,
      type: "EXPENSE",
      classification: "VARIABLE",
      description: "with tag",
      amountCents: 500,
      date: "2026-08-01",
    }).returning();

    const [createdTag] = await db.insert(tags).values({ userId: user.id, name: "Casa" }).returning();
    await db.insert(entryTags).values({ entryId: tag.id, tagId: createdTag.id });

    await loginAs(user.id);
    await expect(deleteEntry(tag.id)).rejects.toMatchObject({ digest: expect.stringContaining("/entries") });

    const remainingLinks = await db.select().from(entryTags).where(eq(entryTags.entryId, tag.id));
    expect(remainingLinks).toHaveLength(0);
  });
});

describe("toggleEntryStatus", () => {
  it("flips PENDING <-> PAID for the owner", async () => {
    const user = await createTestUser();
    await loginAs(user.id);
    const [entry] = await db
      .insert(financialEntries)
      .values({ userId: user.id, type: "EXPENSE", classification: "VARIABLE", description: "conta", amountCents: 5000, date: "2026-08-10" })
      .returning();
    expect(entry.status).toBe("PENDING");

    await toggleEntryStatus(entry.id, "PAID");
    const [paid] = await db.select().from(financialEntries).where(eq(financialEntries.id, entry.id));
    expect(paid.status).toBe("PAID");

    await toggleEntryStatus(entry.id, "PENDING");
    const [pending] = await db.select().from(financialEntries).where(eq(financialEntries.id, entry.id));
    expect(pending.status).toBe("PENDING");
  });

  it("refuses to change another user's entry", async () => {
    const owner = await createTestUser({ username: "status-owner" });
    const attacker = await createTestUser({ username: "status-attacker" });
    const [entry] = await db
      .insert(financialEntries)
      .values({ userId: owner.id, type: "EXPENSE", classification: "VARIABLE", description: "conta", amountCents: 5000, date: "2026-08-10" })
      .returning();

    await loginAs(attacker.id);
    await toggleEntryStatus(entry.id, "PAID");

    const [unchanged] = await db.select().from(financialEntries).where(eq(financialEntries.id, entry.id));
    expect(unchanged.status).toBe("PENDING");
  });
});

describe("getEntries sort: dueDateAsc", () => {
  it("orders by due date ascending, undated entries last", async () => {
    const user = await createTestUser();
    await db.insert(financialEntries).values([
      { userId: user.id, type: "EXPENSE", classification: "VARIABLE", description: "no due date", amountCents: 100, date: "2026-08-01" },
      { userId: user.id, type: "EXPENSE", classification: "FIXED", description: "due 20th", amountCents: 200, date: "2026-08-20", dueDate: "2026-08-20" },
      { userId: user.id, type: "EXPENSE", classification: "FIXED", description: "due 5th", amountCents: 300, date: "2026-08-05", dueDate: "2026-08-05" },
    ]);

    const rows = await getEntries(user.id, { month: "2026-08", type: "EXPENSE", sort: "dueDateAsc" });
    expect(rows.map((r) => r.description)).toEqual(["due 5th", "due 20th", "no due date"]);
  });
});
