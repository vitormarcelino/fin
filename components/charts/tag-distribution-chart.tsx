"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

export type TagSlice = { name: string; reais: number };

const COLORS = ["#2563eb", "#059669", "#d97706", "#dc2626", "#7c3aed", "#0891b2", "#db2777", "#65a30d"];

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default function TagDistributionChart({ data }: { data: TagSlice[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 w-full items-center justify-center text-sm text-foreground/60">
        Nenhuma despesa neste mês.
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="reais" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
              {data.map((slice, i) => (
                <Cell key={slice.name} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => currency.format(Number(value))} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-xs">
        {data.map((slice, i) => (
          <li key={slice.name} className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: COLORS[i % COLORS.length] }}
            />
            <span className="text-foreground/80">
              {slice.name} · {currency.format(slice.reais)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
