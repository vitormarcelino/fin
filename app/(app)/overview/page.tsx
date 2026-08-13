import { requireSession } from "@/lib/auth/session";
import { getExpenseByTagRange, getSixMonthComparison, getSixMonthTypeTotals } from "@/lib/dashboard/queries";
import { buildTrendSeries, calcMonthComparison } from "@/lib/dashboard/calc";
import { addMonths, currentMonthString, formatMonthShortLabel, monthDateRange } from "@/lib/utils/date";
import { StatCard } from "@/components/ui/stat-card";
import { IncomeExpenseTrendChartLazy } from "@/components/charts/income-expense-trend-chart-lazy";
import { TagDistributionChartLazy } from "@/components/charts/tag-distribution-chart-lazy";

/**
 * "Geral" — the multi-month overview, as opposed to the single-month
 * dashboard at `/` ("Mensal"). Always a rolling 6-month window ending in
 * the current month; no month switcher, unlike `/`.
 */
export default async function OverviewPage() {
  const session = await requireSession();
  const month = currentMonthString();
  const rangeStart = addMonths(month, -5);

  const [aggRows, trendRows, tagSlices] = await Promise.all([
    getSixMonthComparison(session.user.id, month),
    getSixMonthTypeTotals(session.user.id, month),
    getExpenseByTagRange(session.user.id, monthDateRange(rangeStart).start, monthDateRange(month).end),
  ]);
  const { current, deltas } = calcMonthComparison(aggRows);

  const trendMonths = Array.from({ length: 6 }, (_, i) => addMonths(month, i - 5));
  const trendData = buildTrendSeries(trendRows, trendMonths).map((point) => ({
    label: formatMonthShortLabel(point.month),
    incomeReais: point.incomeCents / 100,
    expenseReais: point.expenseCents / 100,
  }));
  const tagData = tagSlices.map((slice) => ({ name: slice.tagName, reais: slice.totalCents / 100 }));

  return (
    <div className="flex flex-col gap-6 p-4 pb-24 lg:pb-6">
      <div>
        <h1 className="text-xl font-semibold">Geral</h1>
        <p className="text-sm text-foreground/60">
          {formatMonthShortLabel(rangeStart)} – {formatMonthShortLabel(month)}, comparado aos 6 meses anteriores
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Receitas"
          valueCents={current.incomeCents}
          tone="income"
          deltaCents={deltas.incomeCents}
          deltaLabel="período anterior"
        />
        <StatCard
          label="Despesas"
          valueCents={current.expenseCents}
          tone="expense"
          deltaCents={deltas.expenseCents}
          deltaFavorableWhenPositive={false}
          deltaLabel="período anterior"
        />
      </div>

      <StatCard
        label="Saldo do período"
        valueCents={current.balanceCents}
        tone={current.balanceCents >= 0 ? "income" : "expense"}
        deltaCents={deltas.balanceCents}
        deltaLabel="período anterior"
      />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-foreground/70">Receitas x despesas (6 meses)</h2>
        <div className="rounded-xl border border-black/10 p-3 dark:border-white/15">
          <IncomeExpenseTrendChartLazy data={trendData} />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-foreground/70">Despesas por tag (6 meses)</h2>
        <div className="rounded-xl border border-black/10 p-3 dark:border-white/15">
          <TagDistributionChartLazy data={tagData} />
        </div>
      </section>
    </div>
  );
}
