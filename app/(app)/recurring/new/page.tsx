import { requireSession } from "@/lib/auth/session";
import { listTags } from "@/lib/tags/queries";
import { RecurringEntryForm } from "@/components/recurring/recurring-entry-form";

export default async function NewRecurringEntryPage() {
  const session = await requireSession();
  const allTags = await listTags(session.user.id);

  return (
    <div className="flex flex-col gap-4 p-4 pb-24 lg:pb-6">
      <h1 className="text-xl font-semibold">Novo lançamento fixo</h1>
      <RecurringEntryForm allTags={allTags} />
    </div>
  );
}
