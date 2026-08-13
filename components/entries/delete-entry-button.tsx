"use client";

import { deleteEntry } from "@/lib/entries/actions";

export function DeleteEntryButton({ id }: { id: string }) {
  return (
    <form
      action={deleteEntry.bind(null, id)}
      onSubmit={(e) => {
        if (!confirm("Excluir este lançamento? Essa ação não pode ser desfeita.")) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="flex h-12 w-full items-center justify-center rounded-xl border border-red-600/30 text-base font-medium text-red-600 active:opacity-80 dark:text-red-400"
      >
        Excluir lançamento
      </button>
    </form>
  );
}
