import { requireSession } from "@/lib/auth/session";
import { listTags } from "@/lib/tags/queries";
import { EntryForm } from "@/components/entries/entry-form";

export default async function NewEntryPage() {
  const session = await requireSession();
  const allTags = await listTags(session.user.id);

  return (
    <div className="flex flex-col gap-4 p-4 pb-24 lg:pb-6">
      <h1 className="text-xl font-semibold">Novo lançamento</h1>
      <EntryForm allTags={allTags} />
    </div>
  );
}
