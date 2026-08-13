import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { getEntryById } from "@/lib/entries/queries";
import { listTags } from "@/lib/tags/queries";
import { EntryForm } from "@/components/entries/entry-form";
import { DeleteEntryButton } from "@/components/entries/delete-entry-button";

export default async function EditEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();

  const [entry, allTags] = await Promise.all([
    getEntryById(session.user.id, id),
    listTags(session.user.id),
  ]);

  if (!entry) notFound();

  return (
    <div className="flex flex-col gap-4 p-4 pb-24 lg:pb-6">
      <h1 className="text-xl font-semibold">Editar lançamento</h1>
      <EntryForm entry={entry} allTags={allTags} />
      <DeleteEntryButton id={entry.id} />
    </div>
  );
}
