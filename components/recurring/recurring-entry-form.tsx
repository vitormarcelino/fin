"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  createRecurringEntry,
  updateRecurringEntry,
  type RecurringEntryActionState,
} from "@/lib/recurring/actions";
import { centsToInputValue } from "@/lib/utils/money";
import type { Tag } from "@/lib/db/schema";
import type { RecurringEntryWithTags } from "@/lib/recurring/queries";
import { TagPicker } from "@/components/entries/tag-picker";
import { TypeToggle } from "@/components/entries/type-toggle";
import { AmountInput } from "@/components/entries/amount-input";

const initialState: RecurringEntryActionState = {};

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

export function RecurringEntryForm({
  entry,
  allTags,
}: {
  entry?: RecurringEntryWithTags;
  allTags: Tag[];
}) {
  const action = entry ? updateRecurringEntry.bind(null, entry.id) : createRecurringEntry;
  const [state, formAction] = useActionState(action, initialState);
  const [hasFixedAmount, setHasFixedAmount] = useState(
    entry ? entry.amountCents !== null : true,
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <TypeToggle defaultValue={entry?.type ?? "EXPENSE"} hidden={true} />

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
          placeholder="Ex.: Cartão de Crédito XXX"
          defaultValue={entry?.description}
          autoComplete="off"
          className="h-12 w-full rounded-xl border border-black/10 dark:border-white/15 bg-transparent px-4 text-base outline-none focus:border-foreground/40"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="dueDay" className="text-sm font-medium">
          Dia do vencimento (todo mês)
        </label>
        <input
          id="dueDay"
          name="dueDay"
          type="number"
          inputMode="numeric"
          min={1}
          max={31}
          required
          defaultValue={entry?.dueDay}
          className="h-12 w-full rounded-xl border border-black/10 dark:border-white/15 bg-transparent px-4 text-base outline-none focus:border-foreground/40"
        />
        <p className="text-xs text-foreground/60">
          Em meses mais curtos, ajustamos automaticamente para o último dia do mês.
        </p>
      </div>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="hasFixedAmount"
          checked={hasFixedAmount}
          onChange={(e) => setHasFixedAmount(e.target.checked)}
          className="h-5 w-5 rounded border-black/20 dark:border-white/25"
        />
        <span className="text-sm font-medium">O valor é sempre o mesmo</span>
      </label>

      {hasFixedAmount ? (
        <AmountInput
          defaultValue={
            entry && entry.amountCents !== null ? centsToInputValue(entry.amountCents) : undefined
          }
        />
      ) : (
        <p className="text-sm text-foreground/60">
          Valor variável: cada lançamento gerado nasce pendente, para você confirmar o valor
          daquele mês.
        </p>
      )}

      <TagPicker allTags={allTags} defaultSelectedTagIds={entry?.tags.map((t) => t.id)} />

      {state.error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      ) : null}

      <SubmitButton label={entry ? "Salvar alterações" : "Criar lançamento fixo"} />
    </form>
  );
}
