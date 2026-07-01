"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ArrowLeft, ListChecks } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { useApp } from "@/context/AppContext";
import { getTemplateById } from "@/lib/templates";
import {
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
  const { startChecklist, runs } = useApp();
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
        <p className="text-slate-600">Checklist not found.</p>
      </AppShell>
    );
  }

  const handleStart = () => {
    const run = startChecklist(template.id);
    if (run) router.push(`/run/${run.id}`);
  };

  return (
    <AppShell>
      <Link
        href="/checklists"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to templates
      </Link>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-brand-700">
            {categoryLabel(template.category)}
          </span>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
            {scheduleLabel(template.schedule)}
          </span>
        </div>

        <h1 className="mt-3 text-3xl font-bold text-slate-900">
          {template.name}
        </h1>
        <p className="mt-2 text-slate-600">{template.description}</p>

        <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-500">
          <span>{template.items.length} tasks</span>
          <span>~{template.estimatedMinutes} minutes</span>
        </div>

        <button
          type="button"
          onClick={handleStart}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-700"
        >
          <ListChecks className="h-4 w-4" />
          Start Checklist
        </button>
      </div>

      <section className="mt-8">
        <h2 className="mb-4 text-lg font-bold text-slate-900">Tasks Preview</h2>
        <div className="space-y-3">
          {template.items.map((item, index) => (
            <div
              key={item.id}
              className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                {index + 1}
              </span>
              <div>
                <p className="font-medium text-slate-900">{item.title}</p>
                <p className="text-xs text-slate-500">
                  {taskTypeLabel(item.type)}
                  {item.required ? " · Required" : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
