"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  Calendar,
  Clock,
  ListChecks,
  Pencil,
  Play,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { useApp } from "@/context/AppContext";
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
  const { getTemplateById, startChecklist, runs } = useApp();
  const template = getTemplateById(params.id);

  const existingRun = runs.find(
    (r) => r.templateId === params.id && r.status === "in_progress"
  );

  useEffect(() => {
    if (existingRun) {
      router.replace(`/run/${existingRun.id}`);
    }
  }, [existingRun, router]);

  if (!template) {
    return (
      <AppShell>
        <PageHeader
          title="Checklist not found"
          backHref="/checklists"
          backLabel="All checklists"
        />
      </AppShell>
    );
  }

  const handleStart = () => {
    const run = startChecklist(template.id);
    if (run) router.push(`/run/${run.id}`);
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
              <Link
                href={`/checklists/${template.id}/edit`}
                className="btn-secondary"
              >
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
        <div className="glass-panel p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-brand-50 p-2 text-brand-600">
              <ListChecks className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Tasks
              </p>
              <p className="text-lg font-bold text-slate-900">
                {template.items.length} total · {requiredCount} required
              </p>
            </div>
          </div>
        </div>
        <div className="glass-panel p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-50 p-2 text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Est. Duration
              </p>
              <p className="text-lg font-bold text-slate-900">
                ~{template.estimatedMinutes} minutes
              </p>
            </div>
          </div>
        </div>
        <div className="glass-panel p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Schedule
              </p>
              <p className="text-lg font-bold text-slate-900">
                {scheduleLabel(template.schedule)}
              </p>
            </div>
          </div>
        </div>
        <div className="glass-panel p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-violet-50 p-2 text-violet-600">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Source
              </p>
              <p className="text-lg font-bold text-slate-900">
                {template.isCustom ? "Custom" : "Built-in"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <section className="glass-panel overflow-hidden">
        <div className={`border-b border-slate-100 px-6 py-5 ${categoryBorder(template.category)} border-l-4`}>
          <h2 className="section-title">Task Breakdown</h2>
          <p className="mt-1 text-sm text-slate-500">
            Every task records who completed it and when for full accountability.
          </p>
        </div>

        <div className="divide-y divide-slate-100">
          {template.items.map((item, index) => (
            <div key={item.id} className="flex gap-4 px-6 py-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-700">
                {index + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-slate-900">{item.title}</h3>
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                    {taskTypeLabel(item.type)}
                  </span>
                  {item.required && (
                    <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                      Required
                    </span>
                  )}
                </div>
                {item.description && (
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">
                    {item.description}
                  </p>
                )}
                {item.trainingNote && (
                  <p className="mt-2 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">
                    {item.trainingNote}
                  </p>
                )}
                {item.type === "temperature" &&
                  item.minTemp !== undefined &&
                  item.maxTemp !== undefined && (
                    <p className="mt-2 text-xs font-medium text-slate-500">
                      Acceptable range: {item.minTemp}°F – {item.maxTemp}°F
                    </p>
                  )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
