const OPTIONS = [
  { value: "PENDING", label: "Pendente" },
  { value: "PAID", label: "Pago" },
] as const;

export function StatusToggle({ defaultValue }: { defaultValue: "PENDING" | "PAID" }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">Status</span>
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Status do lançamento">
        {OPTIONS.map((opt) => (
          <label key={opt.value} className="relative">
            <input
              type="radio"
              name="status"
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
