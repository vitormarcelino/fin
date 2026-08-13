import { RecurringEntryListItem } from "@/components/recurring/recurring-entry-list-item";
import type { RecurringEntryWithTags } from "@/lib/recurring/queries";

export function RecurringEntryList({ entries }: { entries: RecurringEntryWithTags[] }) {
  if (entries.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-black/10 p-6 text-center text-sm text-foreground/60 dark:border-white/15">
        Você ainda não tem lançamentos fixos. Crie o primeiro acima.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {entries.map((entry) => (
        <RecurringEntryListItem key={entry.id} entry={entry} />
      ))}
    </div>
  );
}
