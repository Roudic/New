"use client";

import { Check, Plus, Trash2 } from "lucide-react";
import { generateId } from "@/lib/utils";
import type { BringItem } from "@/lib/l10/types";

export function BringList({
  items,
  onChange,
}: {
  items: BringItem[];
  onChange: (items: BringItem[]) => void;
}) {
  const toggle = (id: string) => {
    onChange(items.map((item) => (item.id === id ? { ...item, packed: !item.packed } : item)));
  };

  const rename = (id: string, label: string) => {
    onChange(items.map((item) => (item.id === id ? { ...item, label } : item)));
  };

  const remove = (id: string) => {
    onChange(items.filter((item) => item.id !== id));
  };

  const add = () => {
    onChange([...items, { id: generateId(), label: "", packed: false }]);
  };

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li
          key={item.id}
          className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${
            item.packed ? "border-emerald-200 bg-emerald-50/70" : "border-slate-200 bg-white"
          }`}
        >
          <button
            type="button"
            onClick={() => toggle(item.id)}
            aria-pressed={item.packed}
            aria-label={item.packed ? "Mark as still needed" : "Mark as packed"}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
              item.packed ? "bg-emerald-600 text-white" : "border border-slate-300 bg-white text-transparent"
            }`}
          >
            <Check className="h-4 w-4" />
          </button>
          <input
            value={item.label}
            onChange={(event) => rename(item.id, event.target.value)}
            placeholder="Something to bring"
            className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400"
          />
          <button
            type="button"
            onClick={() => remove(item.id)}
            className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
            aria-label="Remove item"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </li>
      ))}
      <li>
        <button type="button" onClick={add} className="btn-secondary w-full py-2 text-sm">
          <Plus className="h-4 w-4" />
          Add to bag
        </button>
      </li>
    </ul>
  );
}
