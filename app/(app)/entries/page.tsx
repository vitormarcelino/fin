import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { getEntries } from "@/lib/entries/queries";
import { ensureRecurringEntriesForMonth } from "@/lib/recurring/generate";
import { listTags } from "@/lib/tags/queries";
import { currentMonthString, isValidMonthString } from "@/lib/utils/date";
import { EntryFilters } from "@/components/entries/entry-filters";
import { EntryList } from "@/components/entries/entry-list";
import type { EntryClassification, EntryType } from "@/lib/entries/schema";

type SearchParams = {
  month?: string;
  type?: string;
  classification?: string;
  tag?: string;
};

export default async function EntriesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await requireSession();
  const params = await searchParams;

  const month =
    params.month && isValidMonthString(params.month) ? params.month : currentMonthString();
  const type: EntryType | undefined =
    params.type === "INCOME" || params.type === "EXPENSE" ? params.type : undefined;
  const classification: EntryClassification | undefined =
    params.classification === "FIXED" || params.classification === "VARIABLE"
      ? params.classification
      : undefined;
  const tagId = params.tag || undefined;

  await ensureRecurringEntriesForMonth(session.user.id, month);

  const [entries, tags] = await Promise.all([
    getEntries(session.user.id, { month, type, classification, tagId }),
    listTags(session.user.id),
  ]);

  return (
    <div className="flex flex-col gap-4 p-4 pb-24 lg:pb-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Lançamentos</h1>
        <div className="flex gap-2">
          <Link
            href="/recurring"
            className="flex h-10 items-center justify-center rounded-xl border border-black/10 px-4 text-sm font-medium active:opacity-70 dark:border-white/15"
          >
            Fixos
          </Link>
          <Link
            href="/entries/new"
            className="flex h-10 items-center justify-center rounded-xl bg-foreground px-4 text-sm font-medium text-background active:opacity-80"
          >
            Novo
          </Link>
        </div>
      </div>

      <EntryFilters tags={tags} currentMonth={month} />
      <EntryList entries={entries} />
    </div>
  );
}
