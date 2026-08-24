import "server-only";

import { requireSession } from "@/lib/auth/session";
import { IMPORT_HEADERS, IMPORT_HEADER_LABELS } from "@/lib/import/schema";

const BOM = "\uFEFF"; // so Excel opens the accented pt-BR headers as UTF-8 instead of guessing latin1

/** Downloadable CSV template with just the recognized header row, in the order shown on the import page. */
export async function GET() {
  await requireSession();

  const header = IMPORT_HEADERS.map((h) => IMPORT_HEADER_LABELS[h]).join(",");
  const csv = BOM + header + "\r\n";

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="modelo-importacao.csv"',
    },
  });
}
