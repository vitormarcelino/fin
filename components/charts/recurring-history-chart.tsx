"use client";

import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type RecurringHistoryPoint = {
  label: string;
  reais: number | null;
  status: "PENDING" | "PAID" | null;
};

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const compactCurrency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const STATUS_LABEL = { PAID: "Pago", PENDING: "Pendente" } as const;

function HistoryTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload: RecurringHistoryPoint }>;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg border border-black/10 bg-background px-3 py-2 text-xs shadow-sm dark:border-white/15">
      <div className="font-medium">{point.label}</div>
      <div className="text-foreground/80">
        {point.reais !== null ? currency.format(point.reais) : point.status ? "Valor não confirmado" : "Sem lançamento"}
      </div>
      {point.status ? <div className="text-foreground/60">{STATUS_LABEL[point.status]}</div> : null}
    </div>
  );
}

export default function RecurringHistoryChart({
  data,
  averageReais,
  color,
}: {
  data: RecurringHistoryPoint[];
  averageReais: number | null;
  color: string;
}) {
  if (data.every((p) => p.reais === null)) {
    return (
      <div className="flex h-64 w-full items-center justify-center text-sm text-foreground/60">
        Nenhum valor confirmado no período.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
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
            <Tooltip content={<HistoryTooltip />} cursor={{ className: "fill-black/5 dark:fill-white/5" }} />
            {averageReais !== null ? (
              <ReferenceLine
                y={averageReais}
                strokeDasharray="4 4"
                className="stroke-foreground/40"
                stroke="currentColor"
              />
            ) : null}
            <Bar dataKey="reais" radius={[4, 4, 0, 0]} maxBarSize={40}>
              {data.map((point) => (
                <Cell
                  key={point.label}
                  fill={color}
                  fillOpacity={point.status === "PENDING" ? 0.35 : 1}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground/70">
        <li className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
          Pago
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color, opacity: 0.35 }} />
          Pendente
        </li>
        {averageReais !== null ? (
          <li className="flex items-center gap-1.5">
            <span className="w-4 border-t border-dashed border-foreground/50" />
            Média {currency.format(averageReais)}
          </li>
        ) : null}
      </ul>
    </div>
  );
}
