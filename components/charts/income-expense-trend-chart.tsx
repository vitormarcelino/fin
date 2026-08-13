"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type TrendPoint = { label: string; incomeReais: number; expenseReais: number };

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

// Default export — this file is only ever reached through a dynamic({ssr:false})
// import (see income-expense-trend-chart-lazy.tsx), which is what actually
// keeps Recharts out of the initial page bundle.
export default function IncomeExpenseTrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-black/10 dark:stroke-white/10" />
          <XAxis dataKey="label" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis fontSize={12} tickLine={false} axisLine={false} width={56} tickFormatter={(v) => currency.format(v)} />
          <Tooltip formatter={(value) => currency.format(Number(value))} />
          <Line type="monotone" dataKey="incomeReais" name="Receitas" stroke="#059669" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="expenseReais" name="Despesas" stroke="#dc2626" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
