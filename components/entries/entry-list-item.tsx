"use client";

import { useState } from "react";
import { formatCentsToBRL } from "@/lib/utils/money";
import { formatDateLabel } from "@/lib/utils/date";
import type { EntryWithTags } from "@/lib/entries/queries";
import { EntryEditModal } from "@/components/entries/entry-edit-modal";

export function EntryListItem({ entry }: { entry: EntryWithTags }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const isIncome = entry.type === "INCOME";
  const isPaid = entry.status === "PAID";
  const { amountCents } = entry;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="flex w-full items-start justify-between gap-3 rounded-xl border border-black/10 bg-white p-4 text-left active:opacity-70"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-left text-[15px] font-medium text-slate-900">{entry.description.trimStart()}</p>
          <p className="mt-1 truncate text-left text-xs text-slate-500">
            {formatDateLabel(entry.date)} · {entry.classification === "FIXED" ? "Fixo" : "Variável"}
            {entry.dueDate ? ` · Vence em ${formatDateLabel(entry.dueDate)}` : ""}
            {entry.tags.length > 0 ? ` · ${entry.tags.map((t) => t.name).join(", ")}` : ""}
          </p>
        </div>

        <div className="ml-auto flex shrink-0 flex-col items-end gap-2">
          {amountCents === null ? (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-semibold text-amber-700">
              Confirmar valor
            </span>
          ) : (
            <span className={`text-sm font-semibold ${isIncome ? "text-emerald-600" : "text-red-600"}`}>
              {isIncome ? "+" : "-"} {formatCentsToBRL(amountCents)}
            </span>
          )}

          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
              isPaid ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
            }`}
          >
            {isPaid ? "Pago" : "Pendente"}
          </span>
        </div>
      </button>

      {isModalOpen ? <EntryEditModal entry={entry} onClose={() => setIsModalOpen(false)} /> : null}
    </>
  );
}
