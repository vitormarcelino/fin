"use client";

import dynamic from "next/dynamic";
import { ChartSkeleton } from "@/components/charts/chart-skeleton";

export const RecurringHistoryChartLazy = dynamic(
  () => import("@/components/charts/recurring-history-chart"),
  { ssr: false, loading: () => <ChartSkeleton /> },
);
