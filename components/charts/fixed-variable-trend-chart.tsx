"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type FixedVariableTrendPoint = { label: string; fixedReais: number; variableReais: number };

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const compactCurrency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

export default function FixedVariableTrendChart({ data }: { data: FixedVariableTrendPoint[] }) {
  if (data.every((p) => p.fixedReais === 0 && p.variableReais === 0)) {
    return (
      <div className="flex h-64 w-full items-center justify-center text-sm text-foreground/60">
        Nenhuma despesa no período.
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-black/10 dark:stroke-white/10" />
          <XAxis dataKey="label" fontSize={12} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis
            fontSize={12}
            tickLine={false}
            axisLine={false}
            width={64}
            tickFormatter={(v) => compactCurrency.format(v)}
          />
          <Tooltip
            formatter={(value) => currency.format(Number(value))}
            cursor={{ className: "fill-black/5 dark:fill-white/5" }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="fixedReais" name="Fixo" stackId="expense" fill="#2563eb" maxBarSize={40} />
          <Bar
            dataKey="variableReais"
            name="Variável"
            stackId="expense"
            fill="#d97706"
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
