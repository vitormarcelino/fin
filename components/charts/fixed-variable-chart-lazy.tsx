"use client";

import dynamic from "next/dynamic";
import { ChartSkeleton } from "@/components/charts/chart-skeleton";

export const FixedVariableChartLazy = dynamic(
  () => import("@/components/charts/fixed-variable-chart"),
  { ssr: false, loading: () => <ChartSkeleton /> },
);
