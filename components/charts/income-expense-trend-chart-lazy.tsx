"use client";

import dynamic from "next/dynamic";
import { ChartSkeleton } from "@/components/charts/chart-skeleton";

// ssr:false is only legal inside a Client Component — this thin wrapper is
// what the (server) dashboard page imports, keeping Recharts out of both the
// server render and the initial client bundle.
export const IncomeExpenseTrendChartLazy = dynamic(
  () => import("@/components/charts/income-expense-trend-chart"),
  { ssr: false, loading: () => <ChartSkeleton /> },
);
