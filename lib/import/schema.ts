import { parseAmountToCents } from "@/lib/utils/money";
import { isValidCalendarDate } from "@/lib/utils/date";

/** Canonical column keys the import understands, in the order shown to the user. */
export const IMPORT_HEADERS = [
  "data",
  "descricao",
  "valor",
  "tipo",
  "classificacao",
  "vencimento",
  "recorrente",
  "tags",
  "observacoes",
  "status",
] as const;
export type ImportHeader = (typeof IMPORT_HEADERS)[number];

export const IMPORT_REQUIRED_HEADERS: readonly ImportHeader[] = ["data", "descricao", "valor"];

export const IMPORT_HEADER_LABELS: Record<ImportHeader, string> = {
  data: "Data",
  descricao: "Descrição",
  valor: "Valor",
  tipo: "Tipo",
  classificacao: "Classificação",
  vencimento: "Vencimento",
  recorrente: "Recorrente",
  tags: "Tags",
  observacoes: "Observações",
  status: "Status",
};

/**
 * Lowercases and strips accents/whitespace. Used both to match a spreadsheet
 * header cell against `IMPORT_HEADERS` and to compare free-text cell values
 * (Tipo, Classificação, Status, Recorrente) case/accent-insensitively.
 */
export function normalizeHeader(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

/** Accepts "AAAA-MM-DD" or "DD/MM/AAAA"; returns ISO "AAAA-MM-DD" or null if invalid/malformed. */
export function parseFlexibleDate(raw: string): string | null {
  const value = raw.trim();

  const iso = /^\d{4}-\d{2}-\d{2}$/.exec(value);
  if (iso) {
    return isValidCalendarDate(value) ? value : null;
  }

  const br = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
  if (br) {
    const [, d, m, y] = br;
    const isoValue = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    return isValidCalendarDate(isoValue) ? isoValue : null;
  }

  return null;
}

export function parseImportAmount(raw: string): number | null {
  return parseAmountToCents(raw);
}

export function parseImportType(raw: string): "INCOME" | "EXPENSE" | null {
  const value = normalizeHeader(raw);
  if (value === "receita" || value === "income") return "INCOME";
  if (value === "despesa" || value === "expense") return "EXPENSE";
  return null;
}

export function parseImportClassification(raw: string): "FIXED" | "VARIABLE" | null {
  const value = normalizeHeader(raw);
  if (value === "fixo" || value === "fixed") return "FIXED";
  if (value === "variavel" || value === "variable") return "VARIABLE";
  return null;
}

export function parseImportStatus(raw: string): "PAID" | "PENDING" | null {
  const value = normalizeHeader(raw);
  if (value === "pago" || value === "paid") return "PAID";
  if (value === "pendente" || value === "pending") return "PENDING";
  return null;
}

/** Splits a "Tags" cell on comma or semicolon into trimmed, non-empty names. */
export function parseImportTags(raw: string): string[] {
  return raw
    .split(/[,;]/)
    .map((t) => t.trim())
    .filter(Boolean);
}
