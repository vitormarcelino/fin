/**
 * Pure bucketing logic for the "Fila de pagamentos" page — no I/O, easy to
 * unit test. Takes an already-fetched list of PENDING expense entries
 * (see `getEntries(userId, { type: "EXPENSE", status: "PENDING" })`) and
 * splits them into overdue / dueToday / upcoming / other based on `dueDate`.
 */
import type { EntryWithTags } from "@/lib/entries/queries";

export type PendingBuckets = {
  /** dueDate is set and in the past. */
  overdue: EntryWithTags[];
  /** dueDate is set and equal to `today`. */
  dueToday: EntryWithTags[];
  /** dueDate is set and between `today` (exclusive) and `upcomingUntil` (inclusive). */
  upcoming: EntryWithTags[];
  /** No dueDate at all, or dueDate further out than `upcomingUntil`. */
  other: EntryWithTags[];
};

/**
 * `today` and `upcomingUntil` are "YYYY-MM-DD" strings, compared
 * lexicographically against `dueDate` (safe for this format — sorts the
 * same as chronological order). Callers typically pass
 * `today = todayDateString()` and `upcomingUntil = addDays(today, 14)`.
 */
export function bucketPendingEntries(
  entries: EntryWithTags[],
  today: string,
  upcomingUntil: string,
): PendingBuckets {
  const buckets: PendingBuckets = { overdue: [], dueToday: [], upcoming: [], other: [] };

  for (const entry of entries) {
    if (entry.dueDate === null) {
      buckets.other.push(entry);
    } else if (entry.dueDate < today) {
      buckets.overdue.push(entry);
    } else if (entry.dueDate === today) {
      buckets.dueToday.push(entry);
    } else if (entry.dueDate <= upcomingUntil) {
      buckets.upcoming.push(entry);
    } else {
      buckets.other.push(entry);
    }
  }

  return buckets;
}
