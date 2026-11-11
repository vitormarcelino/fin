import { beforeEach, describe, expect, it } from "vitest";
import {
  getMonthlyExpenseByClassification,
  getRangeComparison,
  getTopOneOffExpenses,
  getTopRecurringExpenses,
} from "@/lib/dashboard/queries";
import { createTestUser, db, financialEntries, recurringEntries, truncateAll } from "@/tests/db-helpers";

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

async function seedRecurring(userId: string, description: string) {
  const [row] = await db
    .insert(recurringEntries)
    .values({ userId, type: "EXPENSE", description, amountCents: 1000, dueDay: 5 })
    .returning();
  return row;
}

describe("overview queries", () => {
  it("getRangeComparison compares with the previous period of the same length", async () => {
    const user = await createTestUser();
    await seedEntry(user.id, { amountCents: 300, date: "2026-07-10" });
    await seedEntry(user.id, { amountCents: 200, date: "2026-05-10" });
    await seedEntry(user.id, { amountCents: 999, date: "2026-02-28" });

    const rows = await getRangeComparison(user.id, "2026-06", "2026-08");
    const expense = rows.find((r) => r.type === "EXPENSE");
    expect(expense?.currentCents).toBe(300);
    expect(expense?.previousCents).toBe(200);
  });

  it("getMonthlyExpenseByClassification groups expenses by month and classification", async () => {
    const user = await createTestUser();
    const other = await createTestUser();
    await seedEntry(user.id, { classification: "FIXED", amountCents: 500, date: "2026-08-01" });
    await seedEntry(user.id, { classification: "VARIABLE", amountCents: 200, date: "2026-08-15" });
    await seedEntry(user.id, { type: "INCOME", classification: "FIXED", amountCents: 9000, date: "2026-08-01" });
    await seedEntry(other.id, { classification: "FIXED", amountCents: 7000, date: "2026-08-01" });

    const rows = await getMonthlyExpenseByClassification(user.id, "2026-08", "2026-08");
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.classification === "FIXED")?.totalCents).toBe(500);
    expect(rows.find((r) => r.classification === "VARIABLE")?.totalCents).toBe(200);
  });

  it("getTopRecurringExpenses ranks templates by total, ignoring unconfirmed amounts", async () => {
    const user = await createTestUser();
    const rent = await seedRecurring(user.id, "Aluguel");
    const power = await seedRecurring(user.id, "Luz");
    await seedEntry(user.id, { recurringEntryId: rent.id, amountCents: 2000, date: "2026-07-05" });
    await seedEntry(user.id, { recurringEntryId: rent.id, amountCents: 2000, date: "2026-08-05" });
    await seedEntry(user.id, { recurringEntryId: power.id, amountCents: 300, date: "2026-08-05" });
    await seedEntry(user.id, { recurringEntryId: power.id, amountCents: null, date: "2026-06-05" });
    await seedEntry(user.id, { amountCents: 99999, date: "2026-08-05" });

    const ranking = await getTopRecurringExpenses(user.id, "2026-06", "2026-08");
    expect(ranking).toEqual([
      { recurringEntryId: rent.id, description: "Aluguel", totalCents: 4000, occurrences: 2 },
      { recurringEntryId: power.id, description: "Luz", totalCents: 300, occurrences: 1 },
    ]);
  });

  it("getTopOneOffExpenses returns only non-recurring expenses, largest first", async () => {
    const user = await createTestUser();
    const other = await createTestUser();
    const rent = await seedRecurring(user.id, "Aluguel");
    await seedEntry(user.id, { recurringEntryId: rent.id, amountCents: 50000, date: "2026-08-05" });
    await seedEntry(user.id, { description: "TV", amountCents: 3000, date: "2026-08-02" });
    await seedEntry(user.id, { description: "Mercado", amountCents: 800, date: "2026-08-03" });
    await seedEntry(user.id, { description: "Salário", type: "INCOME", amountCents: 90000, date: "2026-08-03" });
    await seedEntry(user.id, { description: "Antigo", amountCents: 90000, date: "2026-01-03" });
    await seedEntry(other.id, { description: "Outro", amountCents: 90000, date: "2026-08-03" });

    const top = await getTopOneOffExpenses(user.id, "2026-08", "2026-08");
    expect(top.map((e) => e.description)).toEqual(["TV", "Mercado"]);
  });
});
