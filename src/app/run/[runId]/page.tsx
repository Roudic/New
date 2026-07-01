"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, PartyPopper } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ProgressRing } from "@/components/ProgressRing";
import { TaskItem } from "@/components/TaskItem";
import { useApp } from "@/context/AppContext";
import { getTemplateById } from "@/lib/templates";
import {
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
  const { getRunById, completeTask, removeTaskCompletion } = useApp();
  const run = getRunById(params.runId);
  const template = run ? getTemplateById(run.templateId) : undefined;

  if (!run || !template) {
    return (
      <AppShell>
        <p className="text-slate-600">Checklist run not found.</p>
        <Link href="/" className="mt-4 inline-block text-brand-600">
          Back to dashboard
        </Link>
      </AppShell>
    );
  }

  const progress = getRunProgress(template, run);
  const isComplete = run.status === "completed";

  return (
    <AppShell>
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Dashboard
      </Link>

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {template.name}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Started {formatDateTime(run.startedAt)} · {run.startedBy}
            </p>
          </div>
          <ProgressRing percent={progress.percent} size={64} strokeWidth={5} />
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-brand-500 transition-all duration-500"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
        <p className="mt-2 text-sm font-medium text-slate-600">
          {progress.completed} of {progress.total} required tasks complete
        </p>
      </div>

      {isComplete && (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex items-start gap-3">
            <PartyPopper className="h-6 w-6 text-emerald-600" />
            <div>
              <h2 className="font-bold text-emerald-900">Checklist Complete</h2>
              <p className="mt-1 text-sm text-emerald-800">
                All tasks recorded with timestamps and employee accountability.
              </p>
              <button
                type="button"
                onClick={() => router.push("/history")}
                className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                View in History
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
              completeTask(run.id, {
                itemId: item.id,
                ...data,
              })
            }
            onUndo={() => removeTaskCompletion(run.id, item.id)}
          />
        ))}
      </div>
    </AppShell>
  );
}
