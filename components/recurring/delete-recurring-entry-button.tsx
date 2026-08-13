"use client";

import { deleteRecurringEntry } from "@/lib/recurring/actions";

export function DeleteRecurringEntryButton({ id }: { id: string }) {
  return (
    <form
      action={deleteRecurringEntry.bind(null, id)}
      onSubmit={(e) => {
        if (
          !confirm(
            "Excluir este lançamento fixo? Os lançamentos já gerados não serão apagados.",
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="flex h-12 w-full items-center justify-center rounded-xl border border-red-600/30 text-base font-medium text-red-600 active:opacity-80 dark:text-red-400"
      >
        Excluir lançamento fixo
      </button>
    </form>
  );
}
