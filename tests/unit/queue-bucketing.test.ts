import { describe, expect, it } from "vitest";
import { bucketPendingEntries } from "@/lib/entries/queue";
import type { EntryWithTags } from "@/lib/entries/queries";

const TODAY = "2026-08-13";
const UPCOMING_UNTIL = "2026-08-27"; // today + 14 days

function makeEntry(overrides: Partial<EntryWithTags>): EntryWithTags {
  return {
    id: crypto.randomUUID(),
    userId: "user-1",
    type: "EXPENSE",
    classification: "VARIABLE",
    description: "Test entry",
    amountCents: 1000,
    date: TODAY,
    dueDate: null,
    notes: null,
    recurringEntryId: null,
    status: "PENDING",
    createdAt: new Date(),
    updatedAt: new Date(),
    tags: [],
    ...overrides,
  };
}

describe("bucketPendingEntries", () => {
  it("buckets a past dueDate as overdue", () => {
    const entry = makeEntry({ dueDate: "2026-08-01" });
    const { overdue, dueToday, upcoming, other } = bucketPendingEntries([entry], TODAY, UPCOMING_UNTIL);
    expect(overdue).toEqual([entry]);
    expect(dueToday).toEqual([]);
    expect(upcoming).toEqual([]);
    expect(other).toEqual([]);
  });

  it("buckets a dueDate within the upcoming window as upcoming", () => {
    const entry = makeEntry({ dueDate: "2026-08-20" });
    const { upcoming } = bucketPendingEntries([entry], TODAY, UPCOMING_UNTIL);
    expect(upcoming).toEqual([entry]);
  });

  it("treats dueDate === today as dueToday, not overdue or upcoming", () => {
    const entry = makeEntry({ dueDate: TODAY });
    const { overdue, dueToday, upcoming } = bucketPendingEntries([entry], TODAY, UPCOMING_UNTIL);
    expect(overdue).toEqual([]);
    expect(dueToday).toEqual([entry]);
    expect(upcoming).toEqual([]);
  });

  it("treats dueDate === upcomingUntil as upcoming, not other", () => {
    const entry = makeEntry({ dueDate: UPCOMING_UNTIL });
    const { upcoming, other } = bucketPendingEntries([entry], TODAY, UPCOMING_UNTIL);
    expect(upcoming).toEqual([entry]);
    expect(other).toEqual([]);
  });

  it("buckets a dueDate past the upcoming window as other", () => {
    const entry = makeEntry({ dueDate: "2026-09-15" });
    const { other } = bucketPendingEntries([entry], TODAY, UPCOMING_UNTIL);
    expect(other).toEqual([entry]);
  });

  it("buckets a null dueDate as other", () => {
    const entry = makeEntry({ dueDate: null });
    const { other } = bucketPendingEntries([entry], TODAY, UPCOMING_UNTIL);
    expect(other).toEqual([entry]);
  });

  it("splits a mixed list into the right buckets", () => {
    const overdueEntry = makeEntry({ dueDate: "2026-07-01" });
    const dueTodayEntry = makeEntry({ dueDate: TODAY });
    const upcomingEntry = makeEntry({ dueDate: "2026-08-14" });
    const otherEntry = makeEntry({ dueDate: null });
    const result = bucketPendingEntries(
      [overdueEntry, dueTodayEntry, upcomingEntry, otherEntry],
      TODAY,
      UPCOMING_UNTIL,
    );
    expect(result).toEqual({
      overdue: [overdueEntry],
      dueToday: [dueTodayEntry],
      upcoming: [upcomingEntry],
      other: [otherEntry],
    });
  });
});
