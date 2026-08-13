"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Tag } from "@/lib/db/schema";

const selectClass =
  "h-10 rounded-xl border border-black/10 dark:border-white/15 bg-transparent px-3 text-sm outline-none focus:border-foreground/40";

export function EntryFilters({ tags, currentMonth }: { tags: Tag[]; currentMonth: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <input
        type="month"
        defaultValue={currentMonth}
        onChange={(e) => updateParam("month", e.target.value)}
        aria-label="Mês"
        className={selectClass}
      />
      <select
        defaultValue={searchParams.get("type") ?? ""}
        onChange={(e) => updateParam("type", e.target.value)}
        aria-label="Tipo"
        className={selectClass}
      >
        <option value="">Todos os tipos</option>
        <option value="INCOME">Receitas</option>
        <option value="EXPENSE">Despesas</option>
      </select>
      <select
        defaultValue={searchParams.get("classification") ?? ""}
        onChange={(e) => updateParam("classification", e.target.value)}
        aria-label="Classificação"
        className={selectClass}
      >
        <option value="">Fixo e variável</option>
        <option value="FIXED">Fixo</option>
        <option value="VARIABLE">Variável</option>
      </select>
      <select
        defaultValue={searchParams.get("tag") ?? ""}
        onChange={(e) => updateParam("tag", e.target.value)}
        aria-label="Tag"
        className={selectClass}
      >
        <option value="">Todas as tags</option>
        {tags.map((tag) => (
          <option key={tag.id} value={tag.id}>
            {tag.name}
          </option>
        ))}
      </select>
    </div>
  );
}
