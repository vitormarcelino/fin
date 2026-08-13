"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { createEntry, updateEntry, type EntryActionState } from "@/lib/entries/actions";
import { centsToInputValue } from "@/lib/utils/money";
import { todayDateString } from "@/lib/utils/date";
import type { Tag } from "@/lib/db/schema";
import type { EntryWithTags } from "@/lib/entries/queries";
import { TagPicker } from "@/components/entries/tag-picker";
import { TypeToggle } from "@/components/entries/type-toggle";
import { ClassificationToggle } from "@/components/entries/classification-toggle";
import { AmountInput } from "@/components/entries/amount-input";

const initialState: EntryActionState = {};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-12 w-full items-center justify-center rounded-xl bg-foreground text-background font-medium text-base active:opacity-80 disabled:opacity-60"
    >
      {pending ? "Salvando…" : label}
    </button>
  );
}

export function EntryForm({ entry, allTags }: { entry?: EntryWithTags; allTags: Tag[] }) {
  const action = entry ? updateEntry.bind(null, entry.id) : createEntry;
  const [state, formAction] = useActionState(action, initialState);
  const [type, setType] = useState<"INCOME" | "EXPENSE">(entry?.type ?? "EXPENSE");

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <TypeToggle defaultValue={type} onChange={setType} />
      <ClassificationToggle defaultValue={entry?.classification ?? "VARIABLE"} />
      <AmountInput
        defaultValue={
          entry && entry.amountCents !== null ? centsToInputValue(entry.amountCents) : undefined
        }
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className="text-sm font-medium">
          Descrição
        </label>
        <input
          id="description"
          name="description"
          type="text"
          required
          maxLength={200}
          defaultValue={entry?.description}
          autoComplete="off"
          className="h-12 w-full rounded-xl border border-black/10 dark:border-white/15 bg-transparent px-4 text-base outline-none focus:border-foreground/40"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="date" className="text-sm font-medium">
          Data
        </label>
        <input
          id="date"
          name="date"
          type="date"
          required
          defaultValue={entry?.date ?? todayDateString()}
          className="h-12 w-full rounded-xl border border-black/10 dark:border-white/15 bg-transparent px-4 text-base outline-none focus:border-foreground/40"
        />
      </div>

      {type === "EXPENSE" ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="dueDate" className="text-sm font-medium">
            Vencimento (opcional)
          </label>
          <input
            id="dueDate"
            name="dueDate"
            type="date"
            defaultValue={entry?.dueDate ?? ""}
            className="h-12 w-full rounded-xl border border-black/10 dark:border-white/15 bg-transparent px-4 text-base outline-none focus:border-foreground/40"
          />
        </div>
      ) : null}

      <TagPicker allTags={allTags} defaultSelectedTagIds={entry?.tags.map((t) => t.id)} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="notes" className="text-sm font-medium">
          Observações (opcional)
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          maxLength={2000}
          defaultValue={entry?.notes ?? ""}
          className="w-full rounded-xl border border-black/10 dark:border-white/15 bg-transparent px-4 py-3 text-base outline-none focus:border-foreground/40"
        />
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      ) : null}

      <SubmitButton label={entry ? "Salvar alterações" : "Adicionar lançamento"} />
    </form>
  );
}
