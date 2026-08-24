import { describe, expect, it } from "vitest";
import {
  normalizeHeader,
  parseFlexibleDate,
  parseImportClassification,
  parseImportStatus,
  parseImportType,
} from "@/lib/import/schema";
import { resolveImportRow, type ImportContext } from "@/lib/import/resolve";
import type { RecurringEntryWithTags } from "@/lib/recurring/queries";
import type { RawImportRow } from "@/lib/import/parse-file";

function fakeRecurring(overrides: Partial<RecurringEntryWithTags> = {}): RecurringEntryWithTags {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    userId: "00000000-0000-0000-0000-0000000000ff",
    type: "EXPENSE",
    description: "Energia",
    amountCents: null,
    dueDay: 10,
    active: true,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    tags: [],
    ...overrides,
  };
}

function contextWith(...templates: RecurringEntryWithTags[]): ImportContext {
  const recurringByName = new Map<string, RecurringEntryWithTags>();
  for (const t of templates) recurringByName.set(normalizeHeader(t.description), t);
  return { recurringByName };
}

const emptyCtx: ImportContext = { recurringByName: new Map() };

describe("normalizeHeader", () => {
  it("lowercases and strips accents", () => {
    expect(normalizeHeader("Descrição")).toBe("descricao");
    expect(normalizeHeader("  ENERGIA  ")).toBe("energia");
  });
});

describe("parseFlexibleDate", () => {
  it("accepts ISO and pt-BR formats", () => {
    expect(parseFlexibleDate("2026-03-05")).toBe("2026-03-05");
    expect(parseFlexibleDate("05/03/2026")).toBe("2026-03-05");
  });

  it("rejects impossible calendar dates and garbage", () => {
    expect(parseFlexibleDate("2026-13-01")).toBeNull();
    expect(parseFlexibleDate("31/02/2026")).toBeNull();
    expect(parseFlexibleDate("not-a-date")).toBeNull();
  });
});

describe("parseImportType / parseImportClassification / parseImportStatus", () => {
  it("are case/accent-insensitive", () => {
    expect(parseImportType("DESPESA")).toBe("EXPENSE");
    expect(parseImportType("receita")).toBe("INCOME");
    expect(parseImportClassification("variável")).toBe("VARIABLE");
    expect(parseImportClassification("Fixo")).toBe("FIXED");
    expect(parseImportStatus("Pago")).toBe("PAID");
    expect(parseImportStatus("pendente")).toBe("PENDING");
  });

  it("return null for unrecognized values", () => {
    expect(parseImportType("xyz")).toBeNull();
    expect(parseImportClassification("xyz")).toBeNull();
    expect(parseImportStatus("xyz")).toBeNull();
  });
});

describe("resolveImportRow — plain rows (no Recorrente)", () => {
  it("resolves a valid row, defaulting classification to VARIABLE and status to PAID", () => {
    const result = resolveImportRow(
      { data: "2026-03-05", descricao: "Mercado", valor: "150,00", tipo: "Despesa" },
      emptyCtx,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.data).toMatchObject({
      type: "EXPENSE",
      classification: "VARIABLE",
      description: "Mercado",
      amountCents: 15000,
      date: "2026-03-05",
      dueDate: null,
      status: "PAID",
      tagIds: [],
      newTagNames: [],
      recurringEntryId: null,
    });
  });

  it("parses a comma-separated Tags column into newTagNames", () => {
    const result = resolveImportRow(
      { data: "2026-03-05", descricao: "Mercado", valor: "10", tipo: "Despesa", tags: "Casa, Mercado" },
      emptyCtx,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.data.newTagNames).toEqual(["Casa", "Mercado"]);
  });

  it("requires Tipo when there's no Recorrente", () => {
    const result = resolveImportRow({ data: "2026-03-05", descricao: "Mercado", valor: "10" }, emptyCtx);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected error");
    expect(result.errors.join(" ")).toMatch(/Tipo é obrigatório/);
  });

  it("collects one error per missing required field", () => {
    const result = resolveImportRow({}, emptyCtx);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected error");
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/Descrição/),
        expect.stringMatching(/Data/),
        expect.stringMatching(/Valor/),
        expect.stringMatching(/Tipo/),
      ]),
    );
  });

  it("rejects an invalid date and an invalid amount", () => {
    const result = resolveImportRow(
      { data: "31/02/2026", descricao: "X", valor: "abc", tipo: "Despesa" },
      emptyCtx,
    );
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected error");
    expect(result.errors.join(" ")).toMatch(/Data inválida/);
    expect(result.errors.join(" ")).toMatch(/Valor inválido/);
  });

  it("Vencimento has no implicit default outside a Recorrente link", () => {
    const result = resolveImportRow(
      { data: "2026-03-05", descricao: "X", valor: "10", tipo: "Despesa" },
      emptyCtx,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.data.dueDate).toBeNull();
  });
});

describe("resolveImportRow — linked to a Recorrente", () => {
  it("inherits type/classification/tags from the template, ignoring the Tipo/Classificação/Tags columns", () => {
    const tag = { id: "tag-1", userId: "u", name: "Casa", createdAt: new Date() };
    const template = fakeRecurring({ type: "EXPENSE", description: "Energia", tags: [tag] });
    const ctx = contextWith(template);

    const result = resolveImportRow(
      {
        data: "2026-03-10",
        descricao: "Conta de luz",
        valor: "220,00",
        recorrente: "energia", // different case/no accent on purpose
        tipo: "Receita", // must be ignored
        classificacao: "Variável", // must be ignored
        tags: "Ignorada", // must be ignored
      },
      ctx,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.data.type).toBe("EXPENSE");
    expect(result.data.classification).toBe("FIXED");
    expect(result.data.recurringEntryId).toBe(template.id);
    expect(result.data.recurringName).toBe("Energia");
    expect(result.data.tagIds).toEqual(["tag-1"]);
    expect(result.data.newTagNames).toEqual([]);
  });

  it("defaults Vencimento to Data for a linked EXPENSE, and leaves it null for a linked INCOME", () => {
    const expenseTemplate = fakeRecurring({ type: "EXPENSE", description: "Energia" });
    const incomeTemplate = fakeRecurring({ id: "tmpl-2", type: "INCOME", description: "Salário" });
    const ctx = contextWith(expenseTemplate, incomeTemplate);

    const expenseRow = resolveImportRow(
      { data: "2026-03-10", descricao: "Luz", valor: "1", recorrente: "Energia" },
      ctx,
    );
    expect(expenseRow.ok).toBe(true);
    if (!expenseRow.ok) throw new Error("expected ok");
    expect(expenseRow.data.dueDate).toBe("2026-03-10");

    const incomeRow = resolveImportRow(
      { data: "2026-03-10", descricao: "Pagamento", valor: "1", recorrente: "Salário" },
      ctx,
    );
    expect(incomeRow.ok).toBe(true);
    if (!incomeRow.ok) throw new Error("expected ok");
    expect(incomeRow.data.dueDate).toBeNull();
  });

  it("errors when Recorrente doesn't match any registered template", () => {
    const result = resolveImportRow(
      { data: "2026-03-10", descricao: "Luz", valor: "1", recorrente: "Água" },
      emptyCtx,
    );
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected error");
    expect(result.errors.join(" ")).toMatch(/Água/);
  });
});

describe("resolveImportRow — Status column", () => {
  const base: RawImportRow = { data: "2026-03-05", descricao: "X", valor: "10", tipo: "Despesa" };

  it("defaults to Pago (PAID)", () => {
    const result = resolveImportRow(base, emptyCtx);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.data.status).toBe("PAID");
  });

  it("honors an explicit Pendente", () => {
    const result = resolveImportRow({ ...base, status: "Pendente" }, emptyCtx);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.data.status).toBe("PENDING");
  });

  it("rejects an unrecognized status value", () => {
    const result = resolveImportRow({ ...base, status: "xyz" }, emptyCtx);
    expect(result.ok).toBe(false);
  });
});
