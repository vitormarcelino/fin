"use client";

import dynamic from "next/dynamic";
import { ChartSkeleton } from "@/components/charts/chart-skeleton";

export const FixedVariableTrendChartLazy = dynamic(
  () => import("@/components/charts/fixed-variable-trend-chart"),
  { ssr: false, loading: () => <ChartSkeleton /> },
);
