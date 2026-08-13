"use client";

import { toggleRecurringEntryActive } from "@/lib/recurring/actions";

export function PauseResumeButton({ id, active }: { id: string; active: boolean }) {
  return (
    <form action={toggleRecurringEntryActive.bind(null, id, !active)}>
      <button
        type="submit"
        className={`h-10 rounded-xl border px-3 text-sm font-medium active:opacity-80 ${
          active
            ? "border-black/10 dark:border-white/15"
            : "border-emerald-600/30 text-emerald-600 dark:text-emerald-400"
        }`}
      >
        {active ? "Parar recorrência" : "Retomar"}
      </button>
    </form>
  );
}
