"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, PartyPopper, User } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { ProgressRing } from "@/components/ProgressRing";
import { TaskItem } from "@/components/TaskItem";
import {
  categoryBorder,
  categoryLabel,
  formatDateTime,
  getCompletionForItem,
  getRunProgress,
} from "@/lib/utils";
import type { ChecklistItem, ChecklistRun, ChecklistTemplate } from "@/lib/types";

interface RunData {
  id: string;
  templateId: string;
  templateName: string;
  category: string;
  schedule: string;
  startedAt: string;
  completedAt?: string;
  startedBy: string;
  status: "in_progress" | "completed";
  completions: Array<{
    itemId: string;
    completedAt: string;
    completedBy: string;
    value?: string | boolean | number;
    photoDataUrl?: string;
    notes?: string;
  }>;
  template?: ChecklistTemplate;
}

export function RunClient({ runId }: { runId: string }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [run, setRun] = useState<RunData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadRun = useCallback(async () => {
    const res = await fetch(`/api/runs/${runId}`);
    if (!res.ok) {
      setRun(null);
      setLoading(false);
      return;
    }
    const data = await res.json();
    setRun(data);
    setLoading(false);
  }, [runId]);

  useEffect(() => {
    loadRun();
  }, [loadRun]);

  if (loading) {
    return (
      <AppShell>
        <div className="glass-panel p-10 text-center text-slate-600">Loading checklist...</div>
      </AppShell>
    );
  }

  if (!run || !run.template) {
    return (
      <AppShell>
        <PageHeader title="Run not found" backHref="/" backLabel="Home" />
      </AppShell>
    );
  }

  const template = run.template;
  const runForProgress: ChecklistRun = {
    id: run.id,
    templateId: run.templateId,
    templateName: run.templateName,
    category: run.category as ChecklistRun["category"],
    schedule: run.schedule as ChecklistRun["schedule"],
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    startedBy: run.startedBy,
    status: run.status,
    completions: run.completions,
  };

  const progress = getRunProgress(template, runForProgress);
  const isComplete = run.status === "completed";

  const completeTask = async (
    itemId: string,
    data: {
      value?: string | boolean | number;
      photoDataUrl?: string;
      notes?: string;
    }
  ) => {
    await fetch(`/api/runs/${runId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, ...data }),
    });
    await loadRun();
  };

  const undoTask = async (itemId: string) => {
    await fetch(`/api/runs/${runId}/tasks?itemId=${itemId}`, {
      method: "DELETE",
    });
    await loadRun();
  };

  return (
    <AppShell>
      <PageHeader
        backHref={
          run.status === "completed"
            ? "/history"
            : session?.user?.role === "ADMIN"
              ? "/admin"
              : "/employee"
        }
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
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-600">
              <User className="h-3.5 w-3.5" />
              {run.startedBy}
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {progress.completed} of {progress.total} required tasks
            </p>
            <div className="h-3 max-w-md overflow-hidden rounded-full bg-slate-100">
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
            <PartyPopper className="h-6 w-6 text-emerald-600" />
            <div>
              <h2 className="text-xl font-bold text-emerald-900">Checklist Complete</h2>
              <p className="mt-1 text-sm text-emerald-800">
                All required tasks logged with timestamps.
              </p>
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
        {template.items.map((item: ChecklistItem, index: number) => (
          <TaskItem
            key={item.id}
            item={item}
            index={index}
            completion={getCompletionForItem(runForProgress, item.id)}
            onComplete={(data) => completeTask(item.id, data)}
            onUndo={() => undoTask(item.id)}
          />
        ))}
      </div>
    </AppShell>
  );
}
