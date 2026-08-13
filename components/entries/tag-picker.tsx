"use client";

import { useState } from "react";
import type { Tag } from "@/lib/db/schema";

/**
 * Manages tag selection for the entry form: existing tags are toggled by id,
 * brand-new names are collected separately. Both are emitted as hidden
 * inputs so they submit atomically with the rest of the entry form —
 * no separate network round-trip to create a tag.
 */
export function TagPicker({
  allTags,
  defaultSelectedTagIds = [],
}: {
  allTags: Tag[];
  defaultSelectedTagIds?: string[];
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(defaultSelectedTagIds));
  const [newNames, setNewNames] = useState<string[]>([]);
  const [draft, setDraft] = useState("");

  function toggleTag(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function addDraftAsTag() {
    const name = draft.trim();
    if (!name) return;

    const existing = allTags.find((t) => t.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      setSelectedIds((prev) => new Set(prev).add(existing.id));
    } else if (!newNames.some((n) => n.toLowerCase() === name.toLowerCase())) {
      setNewNames((prev) => [...prev, name]);
    }
    setDraft("");
  }

  function removeNewName(name: string) {
    setNewNames((prev) => prev.filter((n) => n !== name));
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">Tags</span>

      <div className="flex flex-wrap gap-2">
        {allTags.map((tag) => {
          const active = selectedIds.has(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggleTag(tag.id)}
              aria-pressed={active}
              className={`h-10 rounded-full border px-4 text-sm font-medium active:opacity-80 ${
                active
                  ? "border-foreground bg-foreground text-background"
                  : "border-black/10 dark:border-white/15"
              }`}
            >
              {tag.name}
            </button>
          );
        })}
        {newNames.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => removeNewName(name)}
            className="h-10 rounded-full border border-dashed border-foreground/50 px-4 text-sm font-medium active:opacity-80"
          >
            {name} ✕
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addDraftAsTag();
            }
          }}
          placeholder="Nova tag"
          maxLength={40}
          className="h-11 flex-1 min-w-0 rounded-xl border border-black/10 dark:border-white/15 bg-transparent px-4 text-base outline-none focus:border-foreground/40"
        />
        <button
          type="button"
          onClick={addDraftAsTag}
          className="h-11 shrink-0 rounded-xl border border-black/10 dark:border-white/15 px-4 text-sm font-medium active:opacity-80"
        >
          Adicionar
        </button>
      </div>

      {[...selectedIds].map((id) => (
        <input key={id} type="hidden" name="tagIds" value={id} />
      ))}
      {newNames.map((name) => (
        <input key={name} type="hidden" name="newTagNames" value={name} />
      ))}
    </div>
  );
}
