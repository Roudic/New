"use client";

import Link from "next/link";
import { ChevronRight, ClipboardList } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { useApp } from "@/context/AppContext";
import { getCompletedRuns } from "@/lib/storage";
import {
  categoryBorder,
  categoryLabel,
  formatDateTime,
  getRunProgress,
} from "@/lib/utils";

export default function HistoryPage() {
  const { runs, getTemplateById } = useApp();
  const completedRuns = getCompletedRuns(runs);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Audit Trail"
        title="Completion History"
        description="Every completed checklist with employee name, timestamps, and task-level responses for accountability and compliance."
      />

      {completedRuns.length === 0 ? (
        <div className="glass-panel px-6 py-14 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
            <ClipboardList className="h-7 w-7" />
          </div>
          <p className="mt-4 text-lg font-bold text-slate-900">
            No completed checklists yet
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Finished runs will appear here with full task history.
          </p>
          <Link href="/checklists" className="btn-primary mt-6 inline-flex">
            Start a Checklist
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {completedRuns.map((run) => {
            const template = getTemplateById(run.templateId);
            const progress = template
              ? getRunProgress(template, run)
              : { completed: 0, total: 0, percent: 100 };

            return (
              <Link
                key={run.id}
                href={`/run/${run.id}`}
                className={`group block overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover ${categoryBorder(run.category)} border-l-4`}
              >
                <div className="flex items-center justify-between gap-4 p-5">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold text-slate-900">
                        {run.templateName}
                      </h3>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                        {categoryLabel(run.category)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      Completed{" "}
                      {run.completedAt
                        ? formatDateTime(run.completedAt)
                        : "—"}{" "}
                      · {run.startedBy}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                      <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-emerald-700">
                        {progress.percent}% complete
                      </span>
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-slate-600">
                        {run.completions.length} responses logged
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-brand-600" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
