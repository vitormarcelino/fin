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
        className="flex w-full flex-col items-start justify-start gap-2 rounded-xl border border-black/10 p-4 text-left dark:border-white/15 active:opacity-70"
      >
        <div className="flex w-full flex-col items-start justify-start gap-1 text-left">
          <p className="m-0 block truncate text-left font-medium">{entry.description.trimStart()}</p>
          <p className="m-0 block truncate text-left text-xs text-foreground/60">
            {formatDateLabel(entry.date)} · {entry.classification === "FIXED" ? "Fixo" : "Variável"}
            {entry.dueDate ? ` · Vence em ${formatDateLabel(entry.dueDate)}` : ""}
            {entry.tags.length > 0 ? ` · ${entry.tags.map((t) => t.name).join(", ")}` : ""}
          </p>
        </div>
        <div className="flex w-full items-center justify-between gap-2">
          {amountCents === null ? (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-400/10 dark:text-amber-400">
              Confirmar valor
            </span>
          ) : (
            <span
              className={`font-semibold ${
                isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
              }`}
            >
              {isIncome ? "+" : "-"} {formatCentsToBRL(amountCents)}
            </span>
          )}
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            isPaid
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400"
              : "bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-400"
          }`}
        >
          {isPaid ? "Pago" : "Pendente"}
        </span>
      </button>

      {isModalOpen ? <EntryEditModal entry={entry} onClose={() => setIsModalOpen(false)} /> : null}
    </>
  );
}
