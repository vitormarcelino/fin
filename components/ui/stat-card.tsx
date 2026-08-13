import { formatCentsToBRL } from "@/lib/utils/money";

const toneClass = {
  income: "text-emerald-600 dark:text-emerald-400",
  expense: "text-red-600 dark:text-red-400",
  neutral: "text-foreground",
} as const;

export function StatCard({
  label,
  valueCents,
  tone = "neutral",
  deltaCents,
  deltaFavorableWhenPositive = true,
  deltaLabel = "mês anterior",
}: {
  label: string;
  valueCents: number;
  tone?: keyof typeof toneClass;
  /** Difference vs. the comparison period, in cents. Omit to hide the badge. */
  deltaCents?: number;
  /** Whether a positive delta should render green (true) or red (false). */
  deltaFavorableWhenPositive?: boolean;
  /** What the delta is being compared against, e.g. "mês anterior" or "período anterior". */
  deltaLabel?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-black/10 p-4 dark:border-white/15">
      <span className="text-xs font-medium text-foreground/60">{label}</span>
      <span className={`text-xl font-semibold ${toneClass[tone]}`}>
        {formatCentsToBRL(valueCents)}
      </span>
      {deltaCents !== undefined ? (
        <DeltaBadge cents={deltaCents} favorableWhenPositive={deltaFavorableWhenPositive} label={deltaLabel} />
      ) : null}
    </div>
  );
}

function DeltaBadge({
  cents,
  favorableWhenPositive,
  label,
}: {
  cents: number;
  favorableWhenPositive: boolean;
  label: string;
}) {
  if (cents === 0) {
    return <span className="text-xs text-foreground/50">Igual ao {label}</span>;
  }
  const isPositive = cents > 0;
  const isFavorable = isPositive === favorableWhenPositive;
  const arrow = isPositive ? "↑" : "↓";
  return (
    <span
      className={`text-xs font-medium ${
        isFavorable ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
      }`}
    >
      {arrow} {formatCentsToBRL(Math.abs(cents))} vs. {label}
    </span>
  );
}
