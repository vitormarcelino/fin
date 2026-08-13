import Link from "next/link";
import { formatCentsToBRL } from "@/lib/utils/money";
import type { RecurringEntryWithTags } from "@/lib/recurring/queries";
import { PauseResumeButton } from "@/components/recurring/pause-resume-button";

export function RecurringEntryListItem({ entry }: { entry: RecurringEntryWithTags }) {
  const isIncome = entry.type === "INCOME";
  const valueLabel =
    entry.amountCents !== null ? formatCentsToBRL(entry.amountCents) : "Valor variável";

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-black/10 p-4 dark:border-white/15">
      <div className="flex items-start justify-between gap-3">
        <Link href={`/recurring/${entry.id}/edit`} className="flex min-w-0 flex-col gap-1">
          <span className="truncate font-medium">{entry.description}</span>
          <span className="truncate text-xs text-foreground/60">
            {isIncome ? "Receita" : "Despesa"} · Todo dia {entry.dueDay} ·{" "}
            <span className={isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>
              {valueLabel}
            </span>
            {entry.tags.length > 0 ? ` · ${entry.tags.map((t) => t.name).join(", ")}` : ""}
          </span>
        </Link>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
            entry.active
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400"
              : "bg-black/5 text-foreground/60 dark:bg-white/10"
          }`}
        >
          {entry.active ? "Ativo" : "Pausado"}
        </span>
      </div>
      <PauseResumeButton id={entry.id} active={entry.active} />
    </div>
  );
}
