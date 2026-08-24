"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { previewImport, type ImportPreviewState } from "@/lib/import/actions";
import { ImportPreviewTable } from "@/components/import/import-preview-table";

const initialState: ImportPreviewState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-12 w-full items-center justify-center rounded-xl bg-foreground text-background font-medium text-base active:opacity-80 disabled:opacity-60"
    >
      {pending ? "Lendo arquivo…" : "Analisar arquivo"}
    </button>
  );
}

export function ImportForm() {
  const [state, formAction] = useActionState(previewImport, initialState);

  if (state.rows) {
    return <ImportPreviewTable key={state.fileName} fileName={state.fileName ?? ""} rows={state.rows} />;
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input
        name="file"
        type="file"
        accept=".csv,.xlsx,.xls"
        required
        className="w-full rounded-xl border border-dashed border-black/15 bg-transparent p-4 text-sm outline-none file:mr-3 file:rounded-lg file:border-0 file:bg-foreground/10 file:px-3 file:py-1.5 file:text-sm file:font-medium dark:border-white/20"
      />
      {state.error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      ) : null}
      <SubmitButton />
    </form>
  );
}
