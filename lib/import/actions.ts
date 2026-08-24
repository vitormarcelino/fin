"use server";

import { revalidatePath } from "next/cache";
import { and, eq, gte, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { entryTags, financialEntries } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/session";
import { resolveTagIds } from "@/lib/tags/resolve";
import { monthDateRange } from "@/lib/utils/date";
import { parseSpreadsheetFile, ImportParseError, type ParsedRow } from "@/lib/import/parse-file";
import { buildImportContext, resolveImportRow, type ResolvedImportRow, type RowResolution } from "@/lib/import/resolve";

export type ImportPreviewRow = ParsedRow & { resolution: RowResolution };

export type ImportPreviewState = {
  fileName?: string;
  rows?: ImportPreviewRow[];
  error?: string;
};

function revalidateImportPaths() {
  revalidatePath("/");
  revalidatePath("/entries");
  revalidatePath("/tags");
  revalidatePath("/recurring");
}

/** Parses and validates an uploaded file against the user's data — writes nothing to the database. */
export async function previewImport(
  _prevState: ImportPreviewState,
  formData: FormData,
): Promise<ImportPreviewState> {
  const session = await requireSession();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecione um arquivo CSV ou XLSX." };
  }

  let parsedRows: ParsedRow[];
  try {
    parsedRows = await parseSpreadsheetFile(file);
  } catch (err) {
    if (err instanceof ImportParseError) return { error: err.message };
    throw err;
  }

  if (parsedRows.length === 0) {
    return { error: "Nenhuma linha encontrada no arquivo." };
  }

  const ctx = await buildImportContext(session.user.id);
  const rows: ImportPreviewRow[] = parsedRows.map((row) => ({
    ...row,
    resolution: resolveImportRow(row.values, ctx),
  }));

  return { fileName: file.name, rows };
}

export type ImportConfirmResult = {
  imported: number;
  updated: number;
  failed: { rowNumber: number; error: string }[];
};

/**
 * Re-resolves and writes the given rows (normally the subset of a
 * `previewImport` result the user kept checked). Re-runs `resolveImportRow`
 * from scratch rather than trusting any resolved data the client sent back
 * — the client only ever round-trips the raw parsed cells.
 */
export async function confirmImport(rows: ParsedRow[]): Promise<ImportConfirmResult> {
  const session = await requireSession();
  const userId = session.user.id;

  const ctx = await buildImportContext(userId);

  let imported = 0;
  let updated = 0;
  const failed: { rowNumber: number; error: string }[] = [];

  for (const row of rows) {
    const resolution = resolveImportRow(row.values, ctx);
    if (!resolution.ok) {
      failed.push({ rowNumber: row.rowNumber, error: resolution.errors.join(" ") });
      continue;
    }

    try {
      const wasUpdate = await applyImportRow(userId, resolution.data);
      if (wasUpdate) updated += 1;
      else imported += 1;
    } catch (err) {
      failed.push({
        rowNumber: row.rowNumber,
        error: err instanceof Error ? err.message : "Erro desconhecido ao gravar a linha.",
      });
    }
  }

  if (imported > 0 || updated > 0) {
    revalidateImportPaths();
  }

  return { imported, updated, failed };
}

/**
 * Inserts one resolved row. When it's linked to a recurring template
 * (`recurringEntryId` set) and a `financial_entries` row already exists for
 * that template in the same month — a stub `ensureRecurringEntriesForMonth`
 * generated, or a previous import of the same file — updates it in place
 * instead of creating a duplicate. Returns true when an existing row was
 * updated rather than a new one inserted.
 */
async function applyImportRow(userId: string, data: ResolvedImportRow): Promise<boolean> {
  if (data.recurringEntryId) {
    const { start, end } = monthDateRange(data.date.slice(0, 7));
    const [existing] = await db
      .select({ id: financialEntries.id })
      .from(financialEntries)
      .where(
        and(
          eq(financialEntries.userId, userId),
          eq(financialEntries.recurringEntryId, data.recurringEntryId),
          gte(financialEntries.date, start),
          lt(financialEntries.date, end),
        ),
      )
      .limit(1);

    if (existing) {
      await db
        .update(financialEntries)
        .set({
          amountCents: data.amountCents,
          date: data.date,
          dueDate: data.dueDate,
          notes: data.notes,
          status: data.status,
          updatedAt: new Date(),
        })
        .where(eq(financialEntries.id, existing.id));
      return true;
    }
  }

  const finalTagIds = await resolveTagIds(userId, data.tagIds, data.newTagNames);

  const [created] = await db
    .insert(financialEntries)
    .values({
      userId,
      type: data.type,
      classification: data.classification,
      description: data.description,
      amountCents: data.amountCents,
      date: data.date,
      dueDate: data.dueDate,
      notes: data.notes,
      recurringEntryId: data.recurringEntryId,
      status: data.status,
    })
    .returning({ id: financialEntries.id });

  if (finalTagIds.length > 0) {
    await db.insert(entryTags).values(finalTagIds.map((tagId) => ({ entryId: created.id, tagId })));
  }

  return false;
}
