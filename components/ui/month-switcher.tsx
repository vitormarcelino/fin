import Link from "next/link";
import { addMonths, formatMonthLabel } from "@/lib/utils/date";

/**
 * Prev/next month navigation for the dashboard. Plain links to `?month=...`
 * — no client JS needed, works with the URL as the single source of truth.
 */
export function MonthSwitcher({ month }: { month: string }) {
  const previous = addMonths(month, -1);
  const next = addMonths(month, 1);

  return (
    <div className="flex items-center justify-between gap-2">
      <Link
        href={`/?month=${previous}`}
        aria-label="Mês anterior"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-black/10 text-lg active:opacity-70 dark:border-white/15"
      >
        ‹
      </Link>
      <span className="text-lg font-semibold">{formatMonthLabel(month)}</span>
      <Link
        href={`/?month=${next}`}
        aria-label="Próximo mês"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-black/10 text-lg active:opacity-70 dark:border-white/15"
      >
        ›
      </Link>
    </div>
  );
}
