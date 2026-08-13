import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { logoutAction } from "@/lib/auth/actions";
import { getExpenseByTag, getMonthAggregates, getSixMonthTypeTotals } from "@/lib/dashboard/queries";
import { buildFixedVariablePoints, buildTrendSeries, calcMonthComparison } from "@/lib/dashboard/calc";
import { getEntries } from "@/lib/entries/queries";
import { ensureRecurringEntriesForMonth } from "@/lib/recurring/generate";
import { addMonths, currentMonthString, formatMonthShortLabel, isValidMonthString } from "@/lib/utils/date";
import { MonthSwitcher } from "@/components/ui/month-switcher";
import { StatCard } from "@/components/ui/stat-card";
import { EntryList } from "@/components/entries/entry-list";
import { IncomeExpenseTrendChartLazy } from "@/components/charts/income-expense-trend-chart-lazy";
import { TagDistributionChartLazy } from "@/components/charts/tag-distribution-chart-lazy";
import { FixedVariableChartLazy } from "@/components/charts/fixed-variable-chart-lazy";

type SearchParams = { month?: string };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const month = params.month && isValidMonthString(params.month) ? params.month : currentMonthString();

  await ensureRecurringEntriesForMonth(session.user.id, month);

  const [aggRows, trendRows, tagSlices, monthExpenses, monthIncomes] = await Promise.all([
    getMonthAggregates(session.user.id, month),
    getSixMonthTypeTotals(session.user.id, month),
    getExpenseByTag(session.user.id, month),
    getEntries(session.user.id, { month, type: "EXPENSE", sort: "dueDateAsc" }),
    getEntries(session.user.id, { month, type: "INCOME" }),
  ]);
  const { current, deltas } = calcMonthComparison(aggRows);

  // Chart props are built here, at the server/client boundary: integer
  // cents in, plain reais numbers out — Recharts only ever sees display
  // values, never anything used for money math.
  const trendMonths = Array.from({ length: 6 }, (_, i) => addMonths(month, i - 5));
  const trendData = buildTrendSeries(trendRows, trendMonths).map((point) => ({
    label: formatMonthShortLabel(point.month),
    incomeReais: point.incomeCents / 100,
    expenseReais: point.expenseCents / 100,
  }));
  const tagData = tagSlices.map((slice) => ({ name: slice.tagName, reais: slice.totalCents / 100 }));
  const fixedVariableData = buildFixedVariablePoints(current).map((point) => ({
    category: point.category,
    fixedReais: point.fixedCents / 100,
    variableReais: point.variableCents / 100,
  }));

  return (
    <div className="flex flex-col gap-6 p-4 pb-24 lg:pb-6">
      <div className="flex items-center justify-between">
        {/* <h1 className="text-xl font-semibold">Olá, {session.user.username}</h1> */}
        {/* <form action={logoutAction}>
          <button
            type="submit"
            className="h-9 rounded-xl border border-black/10 px-3 text-xs font-medium active:opacity-70 dark:border-white/15"
          >
            Sair
          </button>
        </form> */}
      </div>

      <MonthSwitcher month={month} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Receitas" valueCents={current.incomeCents} tone="income" deltaCents={deltas.incomeCents} />
        <StatCard
          label="Despesas"
          valueCents={current.expenseCents}
          tone="expense"
          deltaCents={deltas.expenseCents}
          deltaFavorableWhenPositive={false}
        />
      </div>

      <StatCard
        label="Saldo do mês"
        valueCents={current.balanceCents}
        tone={current.balanceCents >= 0 ? "income" : "expense"}
        deltaCents={deltas.balanceCents}
      />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-foreground/70">Despesas do mês</h2>
        <EntryList entries={monthExpenses} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-foreground/70">Receitas do mês</h2>
        <EntryList entries={monthIncomes} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-foreground/70">Detalhamento fixo x variável</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Despesas fixas" valueCents={current.fixedExpenseCents} tone="expense" />
          <StatCard label="Despesas variáveis" valueCents={current.variableExpenseCents} tone="expense" />
          <StatCard label="Receitas fixas" valueCents={current.fixedIncomeCents} tone="income" />
          <StatCard label="Receitas variáveis" valueCents={current.variableIncomeCents} tone="income" />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-foreground/70">Receitas x despesas (6 meses)</h2>
        <div className="rounded-xl border border-black/10 p-3 dark:border-white/15">
          <IncomeExpenseTrendChartLazy data={trendData} />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-foreground/70">Despesas por tag</h2>
        <div className="rounded-xl border border-black/10 p-3 dark:border-white/15">
          <TagDistributionChartLazy data={tagData} />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-foreground/70">Fixo x variável</h2>
        <div className="rounded-xl border border-black/10 p-3 dark:border-white/15">
          <FixedVariableChartLazy data={fixedVariableData} />
        </div>
      </section>

      <div className="flex gap-3">
        <Link
          href="/entries/new"
          className="flex h-11 flex-1 items-center justify-center rounded-xl bg-foreground text-sm font-medium text-background active:opacity-80"
        >
          Novo lançamento
        </Link>
        <Link
          href="/entries"
          className="flex h-11 flex-1 items-center justify-center rounded-xl border border-black/10 text-sm font-medium active:opacity-70 dark:border-white/15"
        >
          Ver lançamentos
        </Link>
      </div>
    </div>
  );
}
