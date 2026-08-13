import type { Ref } from "react";

export function AmountInput({
  defaultValue,
  required = true,
  ref,
}: {
  defaultValue?: string;
  /** Set to false when the amount may legitimately be left blank (e.g. a
   *  recurring template with a variable amount, confirmed per instance). */
  required?: boolean;
  ref?: Ref<HTMLInputElement>;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="amount" className="text-sm font-medium">
        Valor
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-base text-foreground/50">
          R$
        </span>
        <input
          ref={ref}
          id="amount"
          name="amount"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0,00"
          defaultValue={defaultValue}
          required={required}
          className="h-12 w-full rounded-xl border border-black/10 dark:border-white/15 bg-transparent pl-11 pr-4 text-base outline-none focus:border-foreground/40"
        />
      </div>
    </div>
  );
}
