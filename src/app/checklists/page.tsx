"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Plus, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ChecklistCard } from "@/components/ChecklistCard";
import { PageHeader } from "@/components/PageHeader";
import { useApp } from "@/context/AppContext";
import type { ChecklistCategory } from "@/lib/types";
import { categoryLabel } from "@/lib/utils";

type Tab = "all" | "mine" | "templates";

export default function ChecklistsPage() {
  const { settings, getAllTemplates } = useApp();
  const [tab, setTab] = useState<Tab>("all");
  const [filter, setFilter] = useState<ChecklistCategory | "all">("all");

  const templates = getAllTemplates();
  const customChecklists = templates.filter((t) => t.isCustom);
  const isAdmin = settings.role === "ADMIN";

  const filtered = useMemo(() => {
    let list = templates;
    if (tab === "mine") list = customChecklists;
    if (tab === "templates") list = templates.filter((t) => !t.isCustom);
    if (filter !== "all") list = list.filter((t) => t.category === filter);
    return list;
  }, [templates, customChecklists, tab, filter]);

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

  return (
    <AppShell>
      <PageHeader
        eyebrow="Audit Library"
        title="Kitchen Audit Checklists"
        description="Built-in kitchen compliance templates and custom audits you can assign to your crew."
        action={
          isAdmin ? (
            <Link href="/checklists/new" className="btn-primary">
              <Plus className="h-4 w-4" />
              Create Checklist
            </Link>
          ) : undefined
        }
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {(
          [
            ["all", "All"],
            ["mine", "My Checklists"],
            ["templates", "Built-in"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              tab === value
                ? "bg-brand-600 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setFilter(cat)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${
              filter === cat
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200"
            }`}
          >
            {cat === "all" ? "All Categories" : categoryLabel(cat)}
          </button>
        ))}
      </div>

      {tab === "mine" && customChecklists.length === 0 && (
        <div className="glass-panel mb-6 py-12 text-center">
          <Sparkles className="mx-auto h-8 w-8 text-violet-500" />
          <p className="mt-3 font-bold text-slate-900">No custom checklists yet</p>
          {isAdmin && (
            <Link href="/checklists/new" className="btn-primary mt-4 inline-flex">
              Create Checklist
            </Link>
          )}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {filtered.map((template) => (
          <ChecklistCard
            key={template.id}
            template={template}
            showStart={isAdmin}
            showEdit={isAdmin}
          />
        ))}
      </div>
    </AppShell>
  );
}
