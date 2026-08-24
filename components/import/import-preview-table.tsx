"use client";

import { useState, useTransition } from "react";
import { confirmImport, type ImportConfirmResult, type ImportPreviewRow } from "@/lib/import/actions";
import { formatCentsToBRL } from "@/lib/utils/money";
import { formatDateLabel } from "@/lib/utils/date";

export function ImportPreviewTable({ fileName, rows }: { fileName: string; rows: ImportPreviewRow[] }) {
  const validRows = rows.filter((r) => r.resolution.ok);
  const invalidRows = rows.filter((r) => !r.resolution.ok);

  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const [result, setResult] = useState<ImportConfirmResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedRows = validRows.filter((r) => !excluded.has(r.rowNumber));

  function toggle(rowNumber: number) {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(rowNumber)) next.delete(rowNumber);
      else next.add(rowNumber);
      return next;
    });
  }

  function handleConfirm() {
    startTransition(async () => {
      const res = await confirmImport(selectedRows);
      setResult(res);
    });
  }

  if (result) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-black/10 bg-white p-4 dark:border-white/15 dark:bg-transparent">
        <p className="text-sm font-medium text-slate-900 dark:text-foreground">Importação concluída</p>
        <ul className="flex flex-col gap-1 text-sm text-foreground/80">
          <li>{result.imported} lançamento(s) criado(s)</li>
          <li>{result.updated} lançamento(s) atualizado(s) (já existia um lançamento daquele gasto fixo no mesmo mês)</li>
          {result.failed.length > 0 ? (
            <li className="text-red-600 dark:text-red-400">{result.failed.length} linha(s) com erro</li>
          ) : null}
        </ul>
        {result.failed.length > 0 ? (
          <ul className="flex flex-col gap-1 text-xs text-red-600 dark:text-red-400">
            {result.failed.map((f) => (
              <li key={f.rowNumber}>
                Linha {f.rowNumber}: {f.error}
              </li>
            ))}
          </ul>
        ) : null}
        <div className="flex gap-2">
          <a
            href="/entries"
            className="flex h-11 flex-1 items-center justify-center rounded-xl bg-foreground text-background text-sm font-medium active:opacity-80"
          >
            Ver lançamentos
          </a>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="flex h-11 flex-1 items-center justify-center rounded-xl border border-black/10 text-sm font-medium active:opacity-70 dark:border-white/15"
          >
            Importar outro arquivo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-foreground/60">
        {fileName} — {validRows.length} válida(s), {invalidRows.length} com erro
      </p>

      <div className="overflow-x-auto rounded-xl border border-black/10 dark:border-white/15">
        <table className="w-full min-w-[760px] text-left text-xs">
          <thead className="bg-black/[0.03] text-foreground/60 dark:bg-white/[0.04]">
            <tr>
              <th className="w-8 py-2 pl-3" />
              <th className="py-2 px-2 font-medium">Linha</th>
              <th className="py-2 px-2 font-medium">Data</th>
              <th className="py-2 px-2 font-medium">Descrição</th>
              <th className="py-2 px-2 font-medium">Valor</th>
              <th className="py-2 px-2 font-medium">Tipo</th>
              <th className="py-2 px-2 font-medium">Recorrente</th>
              <th className="py-2 px-2 font-medium">Status</th>
              <th className="py-2 px-2 pr-3 font-medium">Erro</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const ok = row.resolution.ok;
              const data = ok ? row.resolution.data : null;
              const checked = ok && !excluded.has(row.rowNumber);
              return (
                <tr
                  key={row.rowNumber}
                  className={`border-t border-black/5 dark:border-white/10 ${ok ? "" : "bg-red-50 dark:bg-red-950/20"}`}
                >
                  <td className="py-2 pl-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!ok}
                      onChange={() => toggle(row.rowNumber)}
                    />
                  </td>
                  <td className="py-2 px-2 text-foreground/60">{row.rowNumber}</td>
                  <td className="py-2 px-2">{data ? formatDateLabel(data.date) : row.values.data || "—"}</td>
                  <td className="py-2 px-2">{data ? data.description : row.values.descricao || "—"}</td>
                  <td className="py-2 px-2">{data ? formatCentsToBRL(data.amountCents) : row.values.valor || "—"}</td>
                  <td className="py-2 px-2">
                    {data
                      ? `${data.type === "INCOME" ? "Receita" : "Despesa"} · ${data.classification === "FIXED" ? "Fixo" : "Variável"}`
                      : "—"}
                  </td>
                  <td className="py-2 px-2">{data?.recurringName ?? "—"}</td>
                  <td className="py-2 px-2">{data ? (data.status === "PAID" ? "Pago" : "Pendente") : "—"}</td>
                  <td className="py-2 px-2 pr-3 text-red-600 dark:text-red-400">
                    {!ok ? row.resolution.errors.join(" ") : ""}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={handleConfirm}
        disabled={selectedRows.length === 0 || isPending}
        className="flex h-12 w-full items-center justify-center rounded-xl bg-foreground text-background font-medium text-base active:opacity-80 disabled:opacity-60"
      >
        {isPending ? "Importando…" : `Confirmar importação (${selectedRows.length})`}
      </button>
    </div>
  );
}
