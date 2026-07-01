"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Calendar,
  Clock,
  ListChecks,
  Pencil,
  Play,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import type { ChecklistTemplate } from "@/lib/types";
import {
  categoryBorder,
  categoryLabel,
  scheduleLabel,
  taskTypeLabel,
} from "@/lib/utils";

export default function ChecklistDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [template, setTemplate] = useState<ChecklistTemplate | null>(null);

  useEffect(() => {
    fetch(`/api/checklists/${params.id}`)
      .then((r) => r.json())
      .then(setTemplate)
      .catch(() => setTemplate(null));
  }, [params.id]);

  if (!template) {
    return (
      <AppShell>
        <PageHeader title="Loading..." backHref="/checklists" backLabel="Back" />
      </AppShell>
    );
  }

  const handleStart = async () => {
    const res = await fetch("/api/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateId: template.id }),
    });
    const run = await res.json();
    router.push(`/run/${run.id}`);
  };

  const requiredCount = template.items.filter((i) => i.required).length;

  return (
    <AppShell>
      <PageHeader
        backHref="/checklists"
        backLabel="All checklists"
        eyebrow={categoryLabel(template.category)}
        title={template.name}
        description={template.description}
        action={
          <div className="flex flex-wrap gap-2">
            {template.isCustom && (
              <Link href={`/checklists/${template.id}/edit`} className="btn-secondary">
                <Pencil className="h-4 w-4" />
                Edit
              </Link>
            )}
            <button type="button" className="btn-primary" onClick={handleStart}>
              <Play className="h-4 w-4" />
              Start Checklist
            </button>
          </div>
        }
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={ListChecks} label="Tasks" value={`${template.items.length} · ${requiredCount} required`} />
        <Stat icon={Clock} label="Duration" value={`~${template.estimatedMinutes} min`} />
        <Stat icon={Calendar} label="Schedule" value={scheduleLabel(template.schedule)} />
        <Stat icon={Sparkles} label="Source" value={template.isCustom ? "Custom" : "Built-in"} />
      </div>

      <section className={`glass-panel overflow-hidden ${categoryBorder(template.category)} border-l-4`}>
        <div className="border-b border-slate-100 px-6 py-5">
          <h2 className="section-title">Task Breakdown</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {template.items.map((item, index) => (
            <div key={item.id} className="flex gap-4 px-6 py-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-700">
                {index + 1}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-slate-900">{item.title}</h3>
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                    {taskTypeLabel(item.type)}
                  </span>
                </div>
                {item.description && (
                  <p className="mt-1 text-sm text-slate-600">{item.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="glass-panel p-4">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-brand-50 p-2 text-brand-600">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="text-sm font-bold text-slate-900">{value}</p>
        </div>
      </div>
    </div>
  );
}
