const OPTIONS = [
  { value: "EXPENSE", label: "Despesa" },
  { value: "INCOME", label: "Receita" },
] as const;

export function TypeToggle({
  defaultValue,
  hidden = false,
  onChange,
}: {
  defaultValue: "INCOME" | "EXPENSE";
  hidden?: boolean;
  /** Notified with the newly selected value — lets a parent conditionally
   *  render fields that depend on type (e.g. "Vencimento" for despesas). */
  onChange?: (value: "INCOME" | "EXPENSE") => void;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${hidden ? "hidden" : ""}`}>
      <span className="text-sm font-medium">Tipo</span>
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo de lançamento">
        {OPTIONS.map((opt) => (
          <label key={opt.value} className="relative">
            <input
              type="radio"
              name="type"
              value={opt.value}
              defaultChecked={opt.value === defaultValue}
              onChange={() => onChange?.(opt.value)}
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
  );
}
