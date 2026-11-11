import Link from "next/link";
import { formatCentsToBRL } from "@/lib/utils/money";

export type RankedExpenseItem = {
  key: string;
  href: string;
  title: string;
  subtitle: string;
  cents: number;
};

export function RankedExpenseList({ items, emptyMessage }: { items: RankedExpenseItem[]; emptyMessage: string }) {
  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-black/10 p-6 text-center text-sm text-foreground/60 dark:border-white/15">
        {emptyMessage}
      </p>
    );
  }

  const max = Math.max(...items.map((item) => item.cents), 1);

  return (
    <ol className="flex flex-col divide-y divide-black/10 rounded-xl border border-black/10 dark:divide-white/15 dark:border-white/15">
      {items.map((item, index) => (
        <li key={item.key}>
          <Link href={item.href} className="flex flex-col gap-2 px-4 py-3 active:opacity-70">
            <div className="flex items-baseline justify-between gap-3">
              <div className="flex min-w-0 items-baseline gap-2">
                <span className="w-5 shrink-0 text-xs tabular-nums text-foreground/50">{index + 1}</span>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium">{item.title}</span>
                  <span className="truncate text-xs text-foreground/60">{item.subtitle}</span>
                </div>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums">{formatCentsToBRL(item.cents)}</span>
            </div>
            <div className="ml-7 h-1.5 rounded-full bg-black/5 dark:bg-white/10">
              <div
                className="h-full rounded-full bg-red-600/70 dark:bg-red-400/70"
                style={{ width: `${Math.max((item.cents / max) * 100, 2)}%` }}
              />
            </div>
          </Link>
        </li>
      ))}
    </ol>
  );
}
