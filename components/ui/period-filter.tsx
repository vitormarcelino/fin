"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { PERIOD_PRESETS } from "@/lib/recurring/history";

const inputClass =
  "h-10 rounded-xl border border-black/10 dark:border-white/15 bg-transparent px-3 text-sm outline-none focus:border-foreground/40";

export function PeriodFilter({
  preset,
  from,
  to,
}: {
  preset: number | null;
  from: string;
  to: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [customFrom, setCustomFrom] = useState(from);
  const [customTo, setCustomTo] = useState(to);

  function applyCustom() {
    if (!customFrom || !customTo) return;
    router.push(`${pathname}?from=${customFrom}&to=${customTo}`);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Período">
        {PERIOD_PRESETS.map((months) => {
          const selected = preset === months;
          return (
            <Link
              key={months}
              href={`${pathname}?months=${months}`}
              aria-current={selected ? "true" : undefined}
              className={`flex h-9 items-center rounded-full px-3.5 text-sm font-medium ${
                selected
                  ? "bg-foreground text-background"
                  : "border border-black/10 text-foreground/70 dark:border-white/15"
              }`}
            >
              {months} meses
            </Link>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="month"
          value={customFrom}
          max={customTo || undefined}
          onChange={(e) => setCustomFrom(e.target.value)}
          aria-label="Mês inicial"
          className={inputClass}
        />
        <span className="text-sm text-foreground/60">até</span>
        <input
          type="month"
          value={customTo}
          min={customFrom || undefined}
          onChange={(e) => setCustomTo(e.target.value)}
          aria-label="Mês final"
          className={inputClass}
        />
        <button
          type="button"
          onClick={applyCustom}
          className={`h-10 rounded-xl px-4 text-sm font-medium ${
            preset === null ? "bg-foreground text-background" : "border border-black/10 dark:border-white/15"
          }`}
        >
          Aplicar
        </button>
      </div>
    </div>
  );
}
