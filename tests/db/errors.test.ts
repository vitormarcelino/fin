import { beforeEach, describe, expect, it } from "vitest";
import { isUniqueViolation } from "@/lib/db/errors";
import { createTestUser, db, tags, truncateAll } from "@/tests/db-helpers";

beforeEach(async () => {
  await truncateAll();
});

describe("isUniqueViolation", () => {
  it("recognizes a real Postgres unique-constraint violation thrown through Drizzle", async () => {
    const user = await createTestUser();
    await db.insert(tags).values({ userId: user.id, name: "Mercado" });

    let caught: unknown;
    try {
      await db.insert(tags).values({ userId: user.id, name: "Mercado" });
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeDefined();
    expect(isUniqueViolation(caught)).toBe(true);
  });

  it("returns false for an unrelated error", () => {
    expect(isUniqueViolation(new Error("boom"))).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
    expect(isUniqueViolation(undefined)).toBe(false);
    expect(isUniqueViolation("a string")).toBe(false);
  });

  it("returns false for an error with an unrelated Postgres code", async () => {
    const user = await createTestUser();
    let caught: unknown;
    try {
      // Violates chk_amount_positive, not a unique constraint (code 23514, not 23505).
      await db.execute(
        `INSERT INTO financial_entries (user_id, type, classification, description, amount_cents, date)
         VALUES ('${user.id}', 'EXPENSE', 'VARIABLE', 'bad amount', -100, '2026-01-01')`,
      );
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeDefined();
    expect(isUniqueViolation(caught)).toBe(false);
  });
});
