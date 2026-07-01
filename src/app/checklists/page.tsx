"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Plus, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ChecklistCard } from "@/components/ChecklistCard";
import { PageHeader } from "@/components/PageHeader";
import { useApp } from "@/context/AppContext";
import { getAllTemplates } from "@/lib/checklists";
import { categoryLabel } from "@/lib/utils";
import type { ChecklistCategory } from "@/lib/types";

type Tab = "all" | "mine" | "templates";

const categories: Array<ChecklistCategory | "all"> = [
  "all",
  "custom",
  "opening",
  "closing",
  "food_safety",
  "cleaning",
  "shift",
  "audit",
];

export default function ChecklistsPage() {
  const { customChecklists } = useApp();
  const [tab, setTab] = useState<Tab>("all");
  const [filter, setFilter] = useState<ChecklistCategory | "all">("all");

  const allTemplates = useMemo(
    () => getAllTemplates(customChecklists),
    [customChecklists]
  );

  const filtered = useMemo(() => {
    let list = allTemplates;
    if (tab === "mine") {
      list = customChecklists;
    } else if (tab === "templates") {
      list = allTemplates.filter((t) => !t.isCustom);
    }
    if (filter !== "all") {
      list = list.filter((t) => t.category === filter);
    }
    return list;
  }, [allTemplates, customChecklists, tab, filter]);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Checklist Library"
        title="Operational Checklists"
        description="Use built-in templates or create your own custom checklists with photo proof, temperature logs, and timestamped accountability."
        action={
          <Link href="/checklists/new" className="btn-primary">
            <Plus className="h-4 w-4" />
            Create Checklist
          </Link>
        }
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {(
          [
            ["all", "All"],
            ["mine", "My Checklists"],
            ["templates", "Built-in Templates"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
              tab === value
                ? "bg-brand-600 text-white shadow-sm"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {label}
            {value === "mine" && customChecklists.length > 0 && (
              <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs">
                {customChecklists.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "mine" && customChecklists.length === 0 && (
        <div className="glass-panel mb-6 flex flex-col items-center px-6 py-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
            <Sparkles className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-slate-900">
            No custom checklists yet
          </h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-600">
            Build your first checklist with custom tasks, instructions, and
            proof requirements tailored to your operation.
          </p>
          <Link href="/checklists/new" className="btn-primary mt-6">
            <Plus className="h-4 w-4" />
            Create Your First Checklist
          </Link>
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setFilter(cat)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
              filter === cat
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {cat === "all" ? "All Categories" : categoryLabel(cat)}
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {filtered.map((template) => (
          <ChecklistCard
            key={template.id}
            template={template}
            showStart
            showEdit
          />
        ))}
      </div>
    </AppShell>
  );
}
