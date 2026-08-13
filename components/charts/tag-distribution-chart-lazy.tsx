"use client";

import dynamic from "next/dynamic";
import { ChartSkeleton } from "@/components/charts/chart-skeleton";

export const TagDistributionChartLazy = dynamic(
  () => import("@/components/charts/tag-distribution-chart"),
  { ssr: false, loading: () => <ChartSkeleton /> },
);
