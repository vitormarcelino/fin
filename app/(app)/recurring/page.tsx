import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { listRecurringEntries } from "@/lib/recurring/queries";
import { RecurringEntryList } from "@/components/recurring/recurring-entry-list";

export default async function RecurringEntriesPage() {
  const session = await requireSession();
  const entries = await listRecurringEntries(session.user.id);

  return (
    <div className="flex flex-col gap-4 p-4 pb-24 lg:pb-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Lançamentos fixos</h1>
        <Link
          href="/recurring/new"
          className="flex h-10 items-center justify-center rounded-xl bg-foreground px-4 text-sm font-medium text-background active:opacity-80"
        >
          Novo
        </Link>
      </div>

      <p className="text-sm text-foreground/60">
        Lançamentos fixos são gerados automaticamente todo mês. Pause um deles quando quiser
        parar de gerar novas ocorrências, sem apagar o histórico já lançado.
      </p>

      <RecurringEntryList entries={entries} />
    </div>
  );
}
