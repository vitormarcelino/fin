import { requireSession } from "@/lib/auth/session";
import {
  getExpenseByTagRange,
  getMonthlyExpenseByClassification,
  getMonthlyTypeTotalsRange,
  getRangeComparison,
  getTopOneOffExpenses,
  getTopRecurringExpenses,
} from "@/lib/dashboard/queries";
import {
  buildClassificationSeries,
  buildTrendSeries,
  calcMonthComparison,
  calcMonthlyAverages,
} from "@/lib/dashboard/calc";
import { monthsInRange, resolveHistoryRange } from "@/lib/recurring/history";
import { currentMonthString, formatDateLabel, formatMonthLabel, formatMonthShortLabel, monthDateRange } from "@/lib/utils/date";
import { formatCentsToBRL } from "@/lib/utils/money";
import { StatCard } from "@/components/ui/stat-card";
import { PeriodFilter } from "@/components/ui/period-filter";
import { IncomeExpenseTrendChartLazy } from "@/components/charts/income-expense-trend-chart-lazy";
import { TagDistributionChartLazy } from "@/components/charts/tag-distribution-chart-lazy";
import { FixedVariableTrendChartLazy } from "@/components/charts/fixed-variable-trend-chart-lazy";
import { RankedExpenseList } from "@/components/overview/ranked-expense-list";

const DEFAULT_OVERVIEW_PERIOD = 6;

type SearchParams = { months?: string; from?: string; to?: string };

export default async function OverviewPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const [session, query] = await Promise.all([requireSession(), searchParams]);
  const range = resolveHistoryRange(query, currentMonthString(), DEFAULT_OVERVIEW_PERIOD);
  const months = monthsInRange(range.from, range.to);

  const userId = session.user.id;
  const [aggRows, trendRows, tagSlices, classificationRows, topRecurring, topOneOff] = await Promise.all([
    getRangeComparison(userId, range.from, range.to),
    getMonthlyTypeTotalsRange(userId, range.from, range.to),
    getExpenseByTagRange(userId, monthDateRange(range.from).start, monthDateRange(range.to).end),
    getMonthlyExpenseByClassification(userId, range.from, range.to),
    getTopRecurringExpenses(userId, range.from, range.to),
    getTopOneOffExpenses(userId, range.from, range.to),
  ]);
  const { current, previous, deltas } = calcMonthComparison(aggRows);
  const averages = calcMonthlyAverages(current, months.length);
  const previousAverages = calcMonthlyAverages(previous, months.length);

  const spansYears = range.from.slice(0, 4) !== range.to.slice(0, 4);
  const monthTick = (month: string) =>
    spansYears ? `${formatMonthShortLabel(month)}/${month.slice(2, 4)}` : formatMonthShortLabel(month);
  const trendData = buildTrendSeries(trendRows, months).map((point) => ({
    label: monthTick(point.month),
    incomeReais: point.incomeCents / 100,
    expenseReais: point.expenseCents / 100,
  }));
  const tagData = tagSlices.map((slice) => ({ name: slice.tagName, reais: slice.totalCents / 100 }));
  const classificationData = buildClassificationSeries(classificationRows, months).map((point) => ({
    label: monthTick(point.month),
    fixedReais: point.fixedCents / 100,
    variableReais: point.variableCents / 100,
  }));
  const fixedShare =
    current.expenseCents > 0 ? Math.round((current.fixedExpenseCents / current.expenseCents) * 100) : null;
  const periodLabel = months.length === 1 ? "1 mês" : `${months.length} meses`;

  return (
    <div className="flex flex-col gap-6 p-4 pb-24 lg:pb-6">
      <div>
        <h1 className="text-xl font-semibold">Geral</h1>
        <p className="text-sm text-foreground/60">
          {formatMonthLabel(range.from)} – {formatMonthLabel(range.to)}, comparado aos {periodLabel} anteriores
        </p>
      </div>

      <PeriodFilter key={`${range.from}-${range.to}`} preset={range.preset} from={range.from} to={range.to} />

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
        <h2 className="text-sm font-semibold text-foreground/70">Médias mensais</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <StatCard
            label="Receita média"
            valueCents={averages.incomeCents}
            tone="income"
            deltaCents={averages.incomeCents - previousAverages.incomeCents}
            deltaLabel="período anterior"
          />
          <StatCard
            label="Despesa média"
            valueCents={averages.expenseCents}
            tone="expense"
            deltaCents={averages.expenseCents - previousAverages.expenseCents}
            deltaFavorableWhenPositive={false}
            deltaLabel="período anterior"
          />
          <div className="col-span-2 lg:col-span-1">
            <StatCard
              label="Saldo médio"
              valueCents={averages.balanceCents}
              tone={averages.balanceCents >= 0 ? "income" : "expense"}
              deltaCents={averages.balanceCents - previousAverages.balanceCents}
              deltaLabel="período anterior"
            />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-foreground/70">Receitas x despesas ({periodLabel})</h2>
        <div className="rounded-xl border border-black/10 p-3 dark:border-white/15">
          <IncomeExpenseTrendChartLazy data={trendData} />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground/70">Despesas fixas x variáveis</h2>
          {fixedShare !== null ? (
            <span className="text-xs text-foreground/60">{fixedShare}% fixas no período</span>
          ) : null}
        </div>
        <div className="rounded-xl border border-black/10 p-3 dark:border-white/15">
          <FixedVariableTrendChartLazy data={classificationData} />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-foreground/70">Lançamentos fixos que mais custaram</h2>
        <RankedExpenseList
          emptyMessage="Nenhum lançamento fixo com valor no período."
          items={topRecurring.map((item) => ({
            key: item.recurringEntryId,
            href: `/recurring/${item.recurringEntryId}`,
            title: item.description,
            subtitle: `${item.occurrences} ${item.occurrences === 1 ? "lançamento" : "lançamentos"} · média ${formatCentsToBRL(
              Math.round(item.totalCents / Math.max(item.occurrences, 1)),
            )}`,
            cents: item.totalCents,
          }))}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-foreground/70">Maiores despesas avulsas</h2>
        <RankedExpenseList
          emptyMessage="Nenhuma despesa avulsa no período."
          items={topOneOff.map((item) => ({
            key: item.id,
            href: `/entries/${item.id}/edit`,
            title: item.description,
            subtitle: formatDateLabel(item.date),
            cents: item.amountCents,
          }))}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-foreground/70">Despesas por tag ({periodLabel})</h2>
        <div className="rounded-xl border border-black/10 p-3 dark:border-white/15">
          <TagDistributionChartLazy data={tagData} />
        </div>
      </section>
    </div>
  );
}
