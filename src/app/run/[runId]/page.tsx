"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2, PartyPopper, User } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { ProgressRing } from "@/components/ProgressRing";
import { TaskItem } from "@/components/TaskItem";
import { useApp } from "@/context/AppContext";
import {
  categoryBorder,
  categoryLabel,
  formatDateTime,
  getCompletionForItem,
  getRunProgress,
} from "@/lib/utils";

export default function RunChecklistPage({
  params,
}: {
  params: { runId: string };
}) {
  const router = useRouter();
  const { getRunById, getTemplateById, completeTask, removeTaskCompletion } =
    useApp();
  const run = getRunById(params.runId);
  const template = run ? getTemplateById(run.templateId) : undefined;

  if (!run || !template) {
    return (
      <AppShell>
        <PageHeader
          title="Checklist run not found"
          backHref="/"
          backLabel="Dashboard"
        />
      </AppShell>
    );
  }

  const progress = getRunProgress(template, run);
  const isComplete = run.status === "completed";

  return (
    <AppShell>
      <PageHeader
        backHref="/"
        backLabel="Dashboard"
        eyebrow={categoryLabel(template.category)}
        title={template.name}
        description={`Started ${formatDateTime(run.startedAt)} · ${run.startedBy}`}
      />

      <div
        className={`glass-panel mb-6 p-6 ${categoryBorder(template.category)} border-l-4`}
      >
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-600">
              <User className="h-3.5 w-3.5" />
              Assigned to {run.startedBy}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500">
                Completion progress
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {progress.completed} of {progress.total} required tasks
              </p>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-500 to-teal-500 transition-all duration-500"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          </div>
          <ProgressRing percent={progress.percent} size={88} strokeWidth={6} />
        </div>
      </div>

      {isComplete && (
        <div className="glass-panel mb-6 border border-emerald-200 bg-emerald-50/80 p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
              <PartyPopper className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-emerald-900">
                Checklist Complete
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-emerald-800">
                Every required task has been logged with timestamps and employee
                accountability. This run is now part of your audit trail.
              </p>
              <button
                type="button"
                onClick={() => router.push("/history")}
                className="btn-primary mt-4 bg-emerald-600 hover:bg-emerald-700"
              >
                <CheckCircle2 className="h-4 w-4" />
                View in History
              </button>
            </div>
          </div>
        </div>
      )}

      <section>
        <div className="mb-4">
          <h2 className="section-title">Tasks</h2>
          <p className="mt-1 text-sm text-slate-500">
            Complete each step below. Required tasks must be finished before
            this checklist can close.
          </p>
        </div>

        <div className="space-y-4">
          {template.items.map((item, index) => (
            <TaskItem
              key={item.id}
              item={item}
              index={index}
              completion={getCompletionForItem(run, item.id)}
              onComplete={(data) =>
                completeTask(run.id, {
                  itemId: item.id,
                  ...data,
                })
              }
              onUndo={() => removeTaskCompletion(run.id, item.id)}
            />
          ))}
        </div>
      </section>
    </AppShell>
  );
}
