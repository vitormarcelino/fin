import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { getRecurringEntryById, getRecurringEntryHistory } from "@/lib/recurring/queries";
import {
  buildMonthlySeries,
  monthsInRange,
  resolveHistoryRange,
  summarizeHistory,
} from "@/lib/recurring/history";
import { currentMonthString, formatDateLabel, formatMonthLabel, formatMonthShortLabel } from "@/lib/utils/date";
import { formatCentsToBRL } from "@/lib/utils/money";
import { StatCard } from "@/components/ui/stat-card";
import { RecurringHistoryChartLazy } from "@/components/charts/recurring-history-chart-lazy";
import { PeriodFilter } from "@/components/ui/period-filter";
import { PauseResumeButton } from "@/components/recurring/pause-resume-button";

type SearchParams = { months?: string; from?: string; to?: string };

export default async function RecurringEntryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ id }, query, session] = await Promise.all([params, searchParams, requireSession()]);

  const entry = await getRecurringEntryById(session.user.id, id);
  if (!entry) notFound();

  const range = resolveHistoryRange(query, currentMonthString());
  const history = await getRecurringEntryHistory(session.user.id, id, range.from, range.to);
  const months = monthsInRange(range.from, range.to);
  const series = buildMonthlySeries(history, months);
  const summary = summarizeHistory(history, series);

  const isIncome = entry.type === "INCOME";
  const tone = isIncome ? "income" : "expense";
  const spansYears = range.from.slice(0, 4) !== range.to.slice(0, 4);
  const chartData = series.map((point) => ({
    label: spansYears
      ? `${formatMonthShortLabel(point.month)}/${point.month.slice(2, 4)}`
      : formatMonthShortLabel(point.month),
    reais: point.amountCents !== null ? point.amountCents / 100 : null,
    status: point.status,
  }));
  const hasConfirmed = series.some((p) => p.amountCents !== null);

  return (
    <div className="flex flex-col gap-6 p-4 pb-24 lg:pb-6">
      <div className="flex flex-col gap-3">
        <Link href="/recurring" className="text-sm text-foreground/60">
          ‹ Lançamentos fixos
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="truncate text-xl font-semibold">{entry.description}</h1>
            <p className="text-sm text-foreground/60">
              {isIncome ? "Receita" : "Despesa"} · Todo dia {entry.dueDay} ·{" "}
              {entry.amountCents !== null ? formatCentsToBRL(entry.amountCents) : "Valor variável"}
              {entry.tags.length > 0 ? ` · ${entry.tags.map((t) => t.name).join(", ")}` : ""}
            </p>
          </div>
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
        <div className="flex gap-2">
          <Link
            href={`/recurring/${entry.id}/edit`}
            className="flex h-10 items-center justify-center rounded-xl border border-black/10 px-4 text-sm font-medium active:opacity-70 dark:border-white/15"
          >
            Editar
          </Link>
          <PauseResumeButton id={entry.id} active={entry.active} />
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground/70">Período</h2>
          <span className="text-xs text-foreground/60">
            {formatMonthLabel(range.from)} – {formatMonthLabel(range.to)}
          </span>
        </div>
        <PeriodFilter key={`${range.from}-${range.to}`} preset={range.preset} from={range.from} to={range.to} />
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total no período" valueCents={summary.totalCents} tone={tone} />
        <StatCard label="Média mensal" valueCents={summary.averageCents} />
        <StatCard label="Maior valor" valueCents={summary.maxCents ?? 0} />
        <StatCard label="Menor valor" valueCents={summary.minCents ?? 0} />
      </div>

      <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
        <InfoTile
          label="Último pagamento"
          value={
            summary.lastPaid
              ? `${formatDateLabel(summary.lastPaid.dueDate ?? summary.lastPaid.date)} · ${
                  summary.lastPaid.amountCents !== null ? formatCentsToBRL(summary.lastPaid.amountCents) : "—"
                }`
              : "Nenhum no período"
          }
        />
        <InfoTile
          label="Pagos / pendentes"
          value={`${summary.paidCount} / ${summary.pendingCount}${
            summary.unconfirmedCount > 0 ? ` · ${summary.unconfirmedCount} sem valor` : ""
          }`}
        />
        <InfoTile
          label="Variação no período"
          value={
            summary.firstToLastDeltaCents === null
              ? "—"
              : `${summary.firstToLastDeltaCents > 0 ? "↑ " : summary.firstToLastDeltaCents < 0 ? "↓ " : ""}${formatCentsToBRL(
                  Math.abs(summary.firstToLastDeltaCents),
                )}`
          }
        />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-foreground/70">Valor por mês</h2>
        <div className="rounded-xl border border-black/10 p-3 dark:border-white/15">
          <RecurringHistoryChartLazy
            data={chartData}
            averageReais={hasConfirmed ? summary.averageCents / 100 : null}
            color={isIncome ? "#059669" : "#dc2626"}
          />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-foreground/70">Histórico de lançamentos</h2>
        {history.length === 0 ? (
          <p className="rounded-xl border border-dashed border-black/10 p-6 text-center text-sm text-foreground/60 dark:border-white/15">
            Nenhum lançamento gerado neste período.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-black/10 rounded-xl border border-black/10 dark:divide-white/15 dark:border-white/15">
            {history.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex min-w-0 flex-col">
                  <span className="text-sm font-medium">{formatMonthLabel(item.date.slice(0, 7))}</span>
                  <span className="text-xs text-foreground/60">
                    {item.dueDate ? `Vence ${formatDateLabel(item.dueDate)}` : formatDateLabel(item.date)}
                  </span>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-sm font-semibold">
                    {item.amountCents !== null ? formatCentsToBRL(item.amountCents) : "Valor a confirmar"}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      item.status === "PAID"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-400"
                    }`}
                  >
                    {item.status === "PAID" ? "✓ Pago" : "● Pendente"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-black/10 p-4 dark:border-white/15">
      <span className="text-xs font-medium text-foreground/60">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
