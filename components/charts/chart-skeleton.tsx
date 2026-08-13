export function ChartSkeleton() {
  return (
    <div
      role="status"
      aria-label="Carregando gráfico"
      className="h-64 w-full animate-pulse rounded-xl bg-black/5 dark:bg-white/5"
    />
  );
}
