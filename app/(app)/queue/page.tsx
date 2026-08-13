import { requireSession } from "@/lib/auth/session";
import { getEntries } from "@/lib/entries/queries";
import { bucketPendingEntries } from "@/lib/entries/queue";
import { addDays, todayDateString } from "@/lib/utils/date";
import { EntryList } from "@/components/entries/entry-list";

const UPCOMING_WINDOW_DAYS = 14;

/**
 * "Fila de pagamentos" — every PENDING expense, regardless of month,
 * bucketed by due date. Unlike `/` and `/overview`, this page is not
 * scoped to a date range on the query side: it fetches all pending
 * expenses and buckets them client-side-free, in `bucketPendingEntries`
 * (lib/entries/queue.ts), so nothing silently falls outside a window.
 */
export default async function QueuePage() {
  const session = await requireSession();
  const today = todayDateString();
  const upcomingUntil = addDays(today, UPCOMING_WINDOW_DAYS);

  const pending = await getEntries(session.user.id, {
    type: "EXPENSE",
    status: "PENDING",
    sort: "dueDateAsc",
  });
  const { overdue, upcoming, other } = bucketPendingEntries(pending, today, upcomingUntil);

  return (
    <div className="flex flex-col gap-6 p-4 pb-24 lg:pb-6">
      <div>
        <h1 className="text-xl font-semibold">Fila de pagamentos</h1>
        <p className="text-sm text-foreground/60">Despesas pendentes, de todos os meses.</p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-red-600 dark:text-red-400">Atrasados</h2>
        <EntryList entries={overdue} emptyMessage="Nenhuma despesa pendente atrasada." />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-amber-600 dark:text-amber-400">
          Próximos {UPCOMING_WINDOW_DAYS} dias
        </h2>
        <EntryList entries={upcoming} emptyMessage="Nenhuma despesa pendente para os próximos dias." />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-foreground/70">Outros pendentes</h2>
        <EntryList entries={other} emptyMessage="Nenhuma outra despesa pendente." />
      </section>
    </div>
  );
}
