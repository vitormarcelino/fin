import { describe, expect, it } from "vitest";
import { entryFormSchema } from "@/lib/entries/schema";

const base = {
  type: "EXPENSE",
  classification: "VARIABLE",
  description: "Mercado",
  amountCents: "10,00",
  date: "2026-11-11",
};

describe("entryFormSchema status", () => {
  it("defaults to PENDING when status is missing", () => {
    expect(entryFormSchema.parse({ ...base, status: null }).status).toBe("PENDING");
  });

  it("accepts PAID", () => {
    expect(entryFormSchema.parse({ ...base, status: "PAID" }).status).toBe("PAID");
  });

  it("rejects unknown status", () => {
    expect(entryFormSchema.safeParse({ ...base, status: "DONE" }).success).toBe(false);
  });
});
