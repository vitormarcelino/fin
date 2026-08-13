"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type FixedVariableBar = { category: string; fixedReais: number; variableReais: number };

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

export default function FixedVariableChart({ data }: { data: FixedVariableBar[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-black/10 dark:stroke-white/10" />
          <XAxis dataKey="category" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis fontSize={12} tickLine={false} axisLine={false} width={56} tickFormatter={(v) => currency.format(v)} />
          <Tooltip formatter={(value) => currency.format(Number(value))} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="fixedReais" name="Fixo" fill="#2563eb" radius={[4, 4, 0, 0]} />
          <Bar dataKey="variableReais" name="Variável" fill="#d97706" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
