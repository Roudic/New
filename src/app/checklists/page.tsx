"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ChecklistCard } from "@/components/ChecklistCard";
import { checklistTemplates } from "@/lib/templates";
import { categoryLabel } from "@/lib/utils";
import type { ChecklistCategory } from "@/lib/types";

const categories: Array<ChecklistCategory | "all"> = [
  "all",
  "opening",
  "closing",
  "food_safety",
  "cleaning",
  "shift",
  "audit",
];

export default function ChecklistsPage() {
  const [filter, setFilter] = useState<ChecklistCategory | "all">("all");

  const filtered = useMemo(() => {
    if (filter === "all") return checklistTemplates;
    return checklistTemplates.filter((t) => t.category === filter);
  }, [filter]);

  return (
    <AppShell>
      <section className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Checklist Templates
        </h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Pre-built operational checklists with photo proof, temperature logs,
          and timestamped accountability — just like Jolt.
        </p>
      </section>

      <div className="mb-6 flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setFilter(cat)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
              filter === cat
                ? "bg-brand-600 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {cat === "all" ? "All" : categoryLabel(cat)}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {filtered.map((template) => (
          <ChecklistCard key={template.id} template={template} showStart />
        ))}
      </div>
    </AppShell>
  );
}
