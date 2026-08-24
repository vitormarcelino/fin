import "server-only";

import { Readable } from "node:stream";
import ExcelJS from "exceljs";
import { IMPORT_HEADERS, IMPORT_HEADER_LABELS, IMPORT_REQUIRED_HEADERS, normalizeHeader, type ImportHeader } from "@/lib/import/schema";

export type RawImportRow = Partial<Record<ImportHeader, string>>;
export type ParsedRow = { rowNumber: number; values: RawImportRow };

/** User-facing parsing failures (bad extension, empty sheet, missing required columns). */
export class ImportParseError extends Error {}

const KNOWN_HEADERS: readonly string[] = IMPORT_HEADERS;

/** Normalizes an ExcelJS cell value to plain text, regardless of the cell's native type. */
function cellToText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) {
    // Date-formatted cells come back as a UTC-midnight Date from ExcelJS.
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "object") {
    if ("result" in value) return cellToText(value.result as ExcelJS.CellValue); // formula cell
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join("");
    }
    if ("text" in value && typeof (value as { text?: unknown }).text === "string") {
      return (value as { text: string }).text;
    }
  }
  return String(value).trim();
}

async function loadWorkbook(file: File): Promise<ExcelJS.Workbook> {
  const name = file.name.toLowerCase();
  const workbook = new ExcelJS.Workbook();

  if (name.endsWith(".csv")) {
    const buffer = Buffer.from(await file.arrayBuffer());
    await workbook.csv.read(Readable.from(buffer));
  } else if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const buffer = await file.arrayBuffer();
    await workbook.xlsx.load(buffer);
  } else {
    throw new ImportParseError("Formato de arquivo não suportado. Envie um .csv ou .xlsx.");
  }

  return workbook;
}

/**
 * Parses a CSV/XLSX upload into rows keyed by canonical header
 * (`ImportHeader`). Columns not recognized from `IMPORT_HEADERS` are
 * ignored; recognized ones are matched accent/case-insensitively. Throws
 * `ImportParseError` for anything that isn't a per-row data problem (bad
 * extension, empty sheet, missing required columns) — those are reported
 * per-row instead, by `resolveImportRow`.
 */
export async function parseSpreadsheetFile(file: File): Promise<ParsedRow[]> {
  let workbook: ExcelJS.Workbook;
  try {
    workbook = await loadWorkbook(file);
  } catch (err) {
    if (err instanceof ImportParseError) throw err;
    throw new ImportParseError("Não foi possível ler o arquivo. Confira se ele não está corrompido.");
  }

  const sheet = workbook.worksheets[0];
  if (!sheet || sheet.rowCount === 0) {
    throw new ImportParseError("A planilha está vazia.");
  }

  const columnHeaders = new Map<number, ImportHeader>();
  sheet.getRow(1).eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const normalized = normalizeHeader(cellToText(cell.value));
    if (KNOWN_HEADERS.includes(normalized)) {
      columnHeaders.set(colNumber, normalized as ImportHeader);
    }
  });

  const found = new Set(columnHeaders.values());
  const missing = IMPORT_REQUIRED_HEADERS.filter((h) => !found.has(h));
  if (missing.length > 0) {
    throw new ImportParseError(
      `Colunas obrigatórias ausentes no cabeçalho: ${missing.map((h) => IMPORT_HEADER_LABELS[h]).join(", ")}.`,
    );
  }

  const rows: ParsedRow[] = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return; // header

    const values: RawImportRow = {};
    let hasAnyValue = false;
    for (const [colNumber, header] of columnHeaders) {
      const text = cellToText(row.getCell(colNumber).value);
      if (text) hasAnyValue = true;
      values[header] = text;
    }
    if (hasAnyValue) rows.push({ rowNumber, values });
  });

  return rows;
}
