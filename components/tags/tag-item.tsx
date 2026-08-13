"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { renameTag, deleteTag, type TagActionState } from "@/lib/tags/actions";
import type { Tag } from "@/lib/db/schema";

const initialState: TagActionState = {};

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-10 shrink-0 rounded-xl bg-foreground px-4 text-sm font-medium text-background active:opacity-80 disabled:opacity-60"
    >
      {pending ? "Salvando…" : "Salvar"}
    </button>
  );
}

export function TagItem({ tag }: { tag: Tag }) {
  const [editing, setEditing] = useState(false);
  const [state, formAction] = useActionState(renameTag.bind(null, tag.id), initialState);

  // Close the edit form once a rename succeeds — derived during render
  // (not an effect) per React's guidance for adjusting state from a prop/value change.
  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (!state.error) {
      setEditing(false);
    }
  }

  if (editing) {
    return (
      <form
        action={formAction}
        className="flex flex-col gap-2 rounded-xl border border-black/10 p-3 dark:border-white/15"
      >
        <div className="flex gap-2">
          <input
            name="name"
            defaultValue={tag.name}
            maxLength={40}
            required
            autoFocus
            className="h-10 min-w-0 flex-1 rounded-xl border border-black/10 bg-transparent px-3 text-base outline-none focus:border-foreground/40 dark:border-white/15"
          />
          <SaveButton />
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="h-10 shrink-0 rounded-xl border border-black/10 px-4 text-sm font-medium active:opacity-80 dark:border-white/15"
          >
            Cancelar
          </button>
        </div>
        {state.error ? (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {state.error}
          </p>
        ) : null}
      </form>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-black/10 p-3 dark:border-white/15">
      <span className="truncate font-medium">{tag.name}</span>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="h-10 rounded-xl border border-black/10 px-3 text-sm font-medium active:opacity-80 dark:border-white/15"
        >
          Editar
        </button>
        <form
          action={deleteTag.bind(null, tag.id)}
          onSubmit={(e) => {
            if (
              !confirm(`Excluir a tag "${tag.name}"? Os lançamentos associados não serão apagados.`)
            ) {
              e.preventDefault();
            }
          }}
        >
          <button
            type="submit"
            className="h-10 rounded-xl border border-red-600/30 px-3 text-sm font-medium text-red-600 active:opacity-80 dark:text-red-400"
          >
            Excluir
          </button>
        </form>
      </div>
    </div>
  );
}
