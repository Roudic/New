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
  const {
    settings,
    getRunById,
    getTemplateById,
    completeTask,
    removeTaskCompletion,
  } = useApp();
  const run = getRunById(params.runId);
  const template = run ? getTemplateById(run.templateId) : undefined;

  if (!run || !template) {
    return (
      <AppShell>
        <PageHeader title="Run not found" backHref="/employee" backLabel="Back" />
      </AppShell>
    );
  }

  const progress = getRunProgress(template, run);
  const isComplete = run.status === "completed";

  return (
    <AppShell>
      <PageHeader
        backHref={backPath(run, settings.role)}
        backLabel="Back"
        eyebrow={categoryLabel(template.category)}
        title={template.name}
        description={`Started ${formatDateTime(run.startedAt)} · ${run.startedBy}`}
      />

      <div
        className={`glass-panel mb-6 p-6 ${categoryBorder(template.category)} border-l-4`}
      >
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase text-slate-600">
              <User className="h-3.5 w-3.5" />
              {run.startedBy}
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {progress.completed} of {progress.total} required tasks
            </p>
            <div className="h-3 max-w-md overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-500 to-teal-500"
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
            <PartyPopper className="h-6 w-6 text-emerald-600" />
            <div>
              <h2 className="text-xl font-bold text-emerald-900">Checklist Complete</h2>
              <button
                type="button"
                onClick={() => router.push("/history")}
                className="btn-primary mt-4 bg-emerald-600 hover:bg-emerald-700"
              >
                <CheckCircle2 className="h-4 w-4" />
                View History
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {template.items.map((item, index) => (
          <TaskItem
            key={item.id}
            item={item}
            index={index}
            completion={getCompletionForItem(run, item.id)}
            onComplete={(data) =>
              completeTask(run.id, { itemId: item.id, ...data })
            }
            onUndo={() => removeTaskCompletion(run.id, item.id)}
          />
        ))}
      </div>
    </AppShell>
  );
}

function backPath(run: { status: string }, role?: "ADMIN" | "EMPLOYEE") {
  if (run.status === "completed") return "/history";
  return role === "ADMIN" ? "/admin" : "/employee";
}
