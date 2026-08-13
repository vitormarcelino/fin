const OPTIONS = [
  { value: "VARIABLE", label: "Variável" },
  { value: "FIXED", label: "Fixo" },
] as const;

export function ClassificationToggle({ defaultValue }: { defaultValue: "FIXED" | "VARIABLE" }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">Classificação</span>
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Classificação do lançamento">
        {OPTIONS.map((opt) => (
          <label key={opt.value} className="relative">
            <input
              type="radio"
              name="classification"
              value={opt.value}
              defaultChecked={opt.value === defaultValue}
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
