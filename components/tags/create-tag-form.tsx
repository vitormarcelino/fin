"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { createTag, type TagActionState } from "@/lib/tags/actions";

const initialState: TagActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-12 shrink-0 rounded-xl bg-foreground px-4 text-sm font-medium text-background active:opacity-80 disabled:opacity-60"
    >
      {pending ? "Criando…" : "Criar"}
    </button>
  );
}

export function CreateTagForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(createTag, initialState);

  useEffect(() => {
    if (state !== initialState && !state.error) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          name="name"
          placeholder="Nova tag"
          maxLength={40}
          required
          className="h-12 min-w-0 flex-1 rounded-xl border border-black/10 bg-transparent px-4 text-base outline-none focus:border-foreground/40 dark:border-white/15"
        />
        <SubmitButton />
      </div>
      {state.error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
