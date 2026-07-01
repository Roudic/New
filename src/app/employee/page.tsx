"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { ArrowRight, Calendar, ClipboardList } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { useApp } from "@/context/AppContext";
import { getAssignmentsForUser } from "@/lib/storage";
import { formatDate } from "@/lib/utils";

export default function EmployeeDashboardPage() {
  const router = useRouter();
  const { settings, assignments, startAssignment, getTemplateById } = useApp();

  const myAssignments = useMemo(() => {
    if (!settings.email) return [];
    return getAssignmentsForUser(assignments, settings.email);
  }, [assignments, settings.email]);

  const pending = myAssignments.filter((a) => a.status === "pending");
  const active = myAssignments.filter((a) => a.status === "in_progress");
  const done = myAssignments.filter((a) => a.status === "completed");

  const handleStart = (assignmentId: string) => {
    const run = startAssignment(assignmentId);
    if (run) router.push(`/run/${run.id}`);
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="My Work"
        title={`Welcome, ${settings.employeeName}`}
        description="Complete the checklists assigned to you."
      />

      {active.length > 0 && (
        <section className="mb-8">
          <h2 className="section-title mb-4">Continue Working</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {active.map((assignment) => {
              const template = getTemplateById(assignment.templateId);
              if (!template) return null;
              return (
                <AssignmentCard
                  key={assignment.id}
                  title={template.name}
                  description={template.description}
                  taskCount={template.items.length}
                  minutes={template.estimatedMinutes}
                  dueDate={assignment.dueDate}
                  notes={assignment.notes}
                  actionLabel="Continue"
                  onAction={() => handleStart(assignment.id)}
                />
              );
            })}
          </div>
        </section>
      )}

      <section className="mb-8">
        <h2 className="section-title mb-4">Assigned to You</h2>
        {pending.length === 0 && active.length === 0 ? (
          <div className="glass-panel p-8 text-center">
            <ClipboardList className="mx-auto h-10 w-10 text-slate-400" />
            <p className="mt-3 font-semibold text-slate-800">No assignments yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Ask your admin to assign a checklist, or sign in as admin to assign one.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {pending.map((assignment) => {
              const template = getTemplateById(assignment.templateId);
              if (!template) return null;
              return (
                <AssignmentCard
                  key={assignment.id}
                  title={template.name}
                  description={template.description}
                  taskCount={template.items.length}
                  minutes={template.estimatedMinutes}
                  dueDate={assignment.dueDate}
                  notes={assignment.notes}
                  actionLabel="Start Checklist"
                  onAction={() => handleStart(assignment.id)}
                />
              );
            })}
          </div>
        )}
      </section>

      {done.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="section-title">Completed</h2>
            <Link href="/history" className="text-sm font-semibold text-brand-600">
              History
            </Link>
          </div>
          <div className="glass-panel divide-y divide-slate-100">
            {done.slice(0, 5).map((a) => {
              const template = getTemplateById(a.templateId);
              return (
                <div key={a.id} className="flex items-center justify-between px-5 py-4">
                  <p className="font-semibold text-slate-900">
                    {template?.name ?? "Checklist"}
                  </p>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                    Done
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </AppShell>
  );
}

function AssignmentCard({
  title,
  description,
  taskCount,
  minutes,
  dueDate,
  notes,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  taskCount: number;
  minutes: number;
  dueDate?: string;
  notes?: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <article className="glass-panel overflow-hidden border-l-4 border-l-brand-500">
      <div className="p-5">
        <h3 className="text-xl font-bold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm text-slate-600">{description}</p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
          <span className="rounded-lg bg-slate-100 px-2.5 py-1">{taskCount} tasks</span>
          <span className="rounded-lg bg-slate-100 px-2.5 py-1">~{minutes} min</span>
          {dueDate && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1 text-amber-700">
              <Calendar className="h-3.5 w-3.5" />
              Due {formatDate(dueDate)}
            </span>
          )}
        </div>
        {notes && (
          <p className="mt-3 rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-800">
            {notes}
          </p>
        )}
      </div>
      <div className="border-t border-slate-100 bg-slate-50/70 p-4">
        <button type="button" onClick={onAction} className="btn-primary w-full">
          {actionLabel}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}
