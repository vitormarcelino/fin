"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { updateEntryValueAndStatus, type QuickEditActionState } from "@/lib/entries/actions";
import { centsToInputValue } from "@/lib/utils/money";
import type { EntryWithTags } from "@/lib/entries/queries";
import { AmountInput } from "@/components/entries/amount-input";

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Pendente" },
  { value: "PAID", label: "Pago" },
] as const;

const initialState: QuickEditActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-12 w-full items-center justify-center rounded-xl bg-foreground text-background font-medium text-base active:opacity-80 disabled:opacity-60"
    >
      {pending ? "Salvando…" : "Salvar"}
    </button>
  );
}

/** Quick-edit modal opened by tapping an EntryListItem card: confirms/changes
 *  the amount and flips the payment status in one save, without leaving the
 *  list.
 *
 *  Only ever mounted while it should be visible — the parent renders this
 *  component conditionally rather than passing an `open` flag. That keeps
 *  every render here a fresh one (no stale success/error state to reset)
 *  and sidesteps native <dialog>/showModal(), which some installed-PWA
 *  (standalone display-mode) WebKit builds fail to present at all. A plain
 *  fixed-position overlay is the one thing guaranteed to render the same
 *  way everywhere. */
export function EntryEditModal({ entry, onClose }: { entry: EntryWithTags; onClose: () => void }) {
  const [state, formAction] = useActionState(updateEntryValueAndStatus.bind(null, entry.id), initialState);
  const amountInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.success) onClose();
  }, [state, onClose]);

  // Esc closes, and the background can't scroll behind the overlay —
  // both handled by the browser for free with <dialog>; done by hand here.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    amountInputRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 dark:bg-black/70"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Editar ${entry.description}`}
        className="flex w-full max-w-sm flex-col gap-5 rounded-2xl border border-black/10 bg-background p-6 text-foreground dark:border-white/15"
      >
        <div className="flex items-center justify-between gap-3">
          <span className="min-w-0 truncate text-base font-medium">{entry.description}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="shrink-0 rounded-full p-1 text-foreground/60 active:opacity-70"
          >
            ✕
          </button>
        </div>

        <form action={formAction} className="flex flex-col gap-5">
          <AmountInput
            ref={amountInputRef}
            defaultValue={entry.amountCents !== null ? centsToInputValue(entry.amountCents) : undefined}
          />

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Status</span>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Status do lançamento">
              {STATUS_OPTIONS.map((opt) => (
                <label key={opt.value} className="relative">
                  <input
                    type="radio"
                    name="status"
                    value={opt.value}
                    defaultChecked={opt.value === entry.status}
                    required
                    className="peer sr-only"
                  />
                  <span className="flex h-12 w-full cursor-pointer items-center justify-center rounded-xl border border-black/10 dark:border-white/15 text-base font-medium peer-checked:border-foreground peer-checked:bg-foreground peer-checked:text-background active:opacity-80">
                    {opt.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {state.error ? (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {state.error}
            </p>
          ) : null}

          <SubmitButton />
        </form>

        <Link
          href={`/entries/${entry.id}/edit`}
          className="text-center text-sm font-medium text-foreground/70 active:opacity-70"
        >
          Editar lançamento completo
        </Link>
      </div>
    </div>
  );
}
