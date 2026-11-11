"use client";

import { useState, type Ref } from "react";
import { formatCentsToBRL, parseAmountToCents } from "@/lib/utils/money";

const MAX_DIGITS = 9;

function formatCents(cents: number): string {
  return formatCentsToBRL(cents).replace("R$ ", "");
}

function initialDisplay(defaultValue?: string): string {
  if (!defaultValue) return "";
  const cents = parseAmountToCents(defaultValue);
  return cents === null ? "" : formatCents(cents);
}

export function AmountInput({
  defaultValue,
  required = true,
  ref,
}: {
  defaultValue?: string;
  required?: boolean;
  ref?: Ref<HTMLInputElement>;
}) {
  const [display, setDisplay] = useState(() => initialDisplay(defaultValue));

  function handleChange(raw: string) {
    const digits = raw.replace(/\D/g, "");
    if (digits.replace(/^0+/, "").length > MAX_DIGITS) return;
    const cents = Number(digits || "0");
    const isDeleting = raw.length < display.length;
    if (!digits || (cents === 0 && isDeleting)) {
      setDisplay("");
      return;
    }
    setDisplay(formatCents(cents));
  }

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
          inputMode="numeric"
          autoComplete="off"
          placeholder="0,00"
          value={display}
          onChange={(e) => handleChange(e.target.value)}
          required={required}
          className="h-12 w-full rounded-xl border border-black/10 dark:border-white/15 bg-transparent pl-11 pr-4 text-base tabular-nums outline-none focus:border-foreground/40"
        />
      </div>
    </div>
  );
}
