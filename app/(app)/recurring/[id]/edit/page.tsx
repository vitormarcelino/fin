import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { getRecurringEntryById } from "@/lib/recurring/queries";
import { listTags } from "@/lib/tags/queries";
import { RecurringEntryForm } from "@/components/recurring/recurring-entry-form";
import { DeleteRecurringEntryButton } from "@/components/recurring/delete-recurring-entry-button";

export default async function EditRecurringEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();

  const [entry, allTags] = await Promise.all([
    getRecurringEntryById(session.user.id, id),
    listTags(session.user.id),
  ]);

  if (!entry) notFound();

  return (
    <div className="flex flex-col gap-4 p-4 pb-24 lg:pb-6">
      <h1 className="text-xl font-semibold">Editar lançamento fixo</h1>
      <RecurringEntryForm entry={entry} allTags={allTags} />
      <DeleteRecurringEntryButton id={entry.id} />
    </div>
  );
}
