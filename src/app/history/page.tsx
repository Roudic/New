"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useApp } from "@/context/AppContext";
import { getCompletedRuns } from "@/lib/storage";
import {
  categoryLabel,
  formatDateTime,
  getRunProgress,
} from "@/lib/utils";
import { getTemplateById } from "@/lib/templates";

export default function HistoryPage() {
  const { runs } = useApp();
  const completedRuns = getCompletedRuns(runs);

  return (
    <AppShell>
      <section className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Completion History
        </h1>
        <p className="mt-2 text-slate-600">
          Audit trail of every completed checklist with employee name and
          timestamp on each task.
        </p>
      </section>

      {completedRuns.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <p className="font-medium text-slate-700">No completed checklists yet.</p>
          <Link
            href="/checklists"
            className="mt-3 inline-block text-sm font-semibold text-brand-600"
          >
            Start your first checklist
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {completedRuns.map((run) => {
            const template = getTemplateById(run.templateId);
            const progress = template
              ? getRunProgress(template, run)
              : { completed: 0, total: 0, percent: 100 };

            return (
              <Link
                key={run.id}
                href={`/run/${run.id}`}
                className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-slate-900">
                      {run.templateName}
                    </h3>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
                      {categoryLabel(run.category)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    Completed{" "}
                    {run.completedAt
                      ? formatDateTime(run.completedAt)
                      : "—"}{" "}
                    · {run.startedBy}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {progress.completed}/{progress.total} tasks ·{" "}
                    {run.completions.length} responses logged
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
              </Link>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
