import { EntryListItem } from "@/components/entries/entry-list-item";
import type { EntryWithTags } from "@/lib/entries/queries";

export function EntryList({
  entries,
  emptyMessage = "Nenhum lançamento encontrado para os filtros selecionados.",
}: {
  entries: EntryWithTags[];
  emptyMessage?: string;
}) {
  if (entries.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-black/10 p-6 text-center text-sm text-foreground/60 dark:border-white/15">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {entries.map((entry) => (
        <EntryListItem key={entry.id} entry={entry} />
      ))}
    </div>
  );
}
