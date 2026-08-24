import "server-only";

import { listRecurringEntries, type RecurringEntryWithTags } from "@/lib/recurring/queries";
import type { RawImportRow } from "@/lib/import/parse-file";
import {
  normalizeHeader,
  parseFlexibleDate,
  parseImportAmount,
  parseImportClassification,
  parseImportStatus,
  parseImportTags,
  parseImportType,
} from "@/lib/import/schema";

export type ResolvedImportRow = {
  type: "INCOME" | "EXPENSE";
  classification: "FIXED" | "VARIABLE";
  description: string;
  amountCents: number;
  date: string;
  dueDate: string | null;
  notes: string | null;
  status: "PAID" | "PENDING";
  /** Already-known tag ids (the linked recurring template's current tags), inserted as-is. */
  tagIds: string[];
  /** Raw tag names from the "Tags" column, resolved/created via resolveTagIds. Only used for unlinked rows. */
  newTagNames: string[];
  recurringEntryId: string | null;
  recurringName: string | null;
};

export type RowResolution = { ok: true; data: ResolvedImportRow } | { ok: false; errors: string[] };

export type ImportContext = {
  recurringByName: Map<string, RecurringEntryWithTags>;
};

/** Loads the user's recurring templates once, keyed by normalized description for "Recorrente" lookups. */
export async function buildImportContext(userId: string): Promise<ImportContext> {
  const templates = await listRecurringEntries(userId);
  const recurringByName = new Map<string, RecurringEntryWithTags>();
  for (const template of templates) {
    const key = normalizeHeader(template.description);
    // First match wins if two templates normalize to the same name — rare,
    // and a full disambiguation UI is out of scope for a CSV/XLSX import.
    if (!recurringByName.has(key)) recurringByName.set(key, template);
  }
  return { recurringByName };
}

/**
 * Validates and normalizes one raw spreadsheet row into the shape needed to
 * write a `financial_entries` row. Pure given `ctx` — never touches the
 * database itself, so it's safe to call again at confirm time instead of
 * trusting resolved data a client already sent back.
 */
export function resolveImportRow(raw: RawImportRow, ctx: ImportContext): RowResolution {
  const errors: string[] = [];

  const description = (raw.descricao ?? "").trim();
  if (!description) errors.push("Descrição é obrigatória.");
  else if (description.length > 200) errors.push("Descrição deve ter no máximo 200 caracteres.");

  const dataRaw = (raw.data ?? "").trim();
  const date = dataRaw ? parseFlexibleDate(dataRaw) : null;
  if (!dataRaw) errors.push("Data é obrigatória.");
  else if (!date) errors.push(`Data inválida: "${dataRaw}".`);

  const valorRaw = (raw.valor ?? "").trim();
  const amountCents = valorRaw ? parseImportAmount(valorRaw) : null;
  if (!valorRaw) errors.push("Valor é obrigatório.");
  else if (amountCents === null) errors.push(`Valor inválido: "${valorRaw}".`);

  let recurring: RecurringEntryWithTags | undefined;
  const recorrenteRaw = (raw.recorrente ?? "").trim();
  if (recorrenteRaw) {
    recurring = ctx.recurringByName.get(normalizeHeader(recorrenteRaw));
    if (!recurring) {
      errors.push(`Nenhum gasto fixo cadastrado chamado "${recorrenteRaw}".`);
    }
  }

  let type: "INCOME" | "EXPENSE" | null = null;
  let classification: "FIXED" | "VARIABLE" = "VARIABLE";
  let tagIds: string[] = [];
  let newTagNames: string[] = [];

  if (recurring) {
    // Linked rows inherit type/classification/tags from the template — the
    // same convention ensureRecurringEntriesForMonth uses for generated
    // instances — so Tipo/Classificação/Tags columns are ignored for them.
    type = recurring.type;
    classification = "FIXED";
    tagIds = recurring.tags.map((t) => t.id);
  } else {
    const tipoRaw = (raw.tipo ?? "").trim();
    if (!tipoRaw) {
      errors.push('Tipo é obrigatório quando não há "Recorrente" preenchido (Receita ou Despesa).');
    } else {
      type = parseImportType(tipoRaw);
      if (!type) errors.push(`Tipo inválido: "${tipoRaw}" (use Receita ou Despesa).`);
    }

    const classificacaoRaw = (raw.classificacao ?? "").trim();
    if (classificacaoRaw) {
      const parsed = parseImportClassification(classificacaoRaw);
      if (!parsed) errors.push(`Classificação inválida: "${classificacaoRaw}" (use Fixo ou Variável).`);
      else classification = parsed;
    }

    newTagNames = parseImportTags(raw.tags ?? "");
  }

  let dueDate: string | null = null;
  const vencimentoRaw = (raw.vencimento ?? "").trim();
  if (vencimentoRaw) {
    const parsed = parseFlexibleDate(vencimentoRaw);
    if (!parsed) errors.push(`Vencimento inválido: "${vencimentoRaw}".`);
    else dueDate = parsed;
  } else if (recurring && type === "EXPENSE" && date) {
    dueDate = date; // mirrors ensureRecurringEntriesForMonth's own default
  }

  let status: "PAID" | "PENDING" = "PAID"; // historical import — these already happened
  const statusRaw = (raw.status ?? "").trim();
  if (statusRaw) {
    const parsed = parseImportStatus(statusRaw);
    if (!parsed) errors.push(`Status inválido: "${statusRaw}" (use Pago ou Pendente).`);
    else status = parsed;
  }

  const notesRaw = (raw.observacoes ?? "").trim();
  if (notesRaw.length > 2000) errors.push("Observações devem ter no máximo 2000 caracteres.");

  if (errors.length > 0 || !date || amountCents === null || !type) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      type,
      classification,
      description,
      amountCents,
      date,
      dueDate,
      notes: notesRaw || null,
      status,
      tagIds,
      newTagNames,
      recurringEntryId: recurring?.id ?? null,
      recurringName: recurring?.description ?? null,
    },
  };
}
