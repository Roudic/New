"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { ArrowRight, Calendar, ClipboardList, User } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AssignmentStatusBadge } from "@/components/AssignmentStatusBadge";
import { PageHeader } from "@/components/PageHeader";
import { useApp } from "@/context/AppContext";
import { getAssignmentsForUser } from "@/lib/storage";
import { isAssignmentOverdue, sortAssignmentsByUrgency } from "@/lib/assignments";
import { categoryLabel, formatDate } from "@/lib/utils";
import type { Assignment, ChecklistTemplate } from "@/lib/types";

export default function EmployeeDashboardPage() {
  const router = useRouter();
  const { settings, assignments, startAssignment, getTemplateById } = useApp();

  const myAssignments = useMemo(() => {
    if (!settings.email) return [];
    const mine = getAssignmentsForUser(assignments, settings.email);
    return sortAssignmentsByUrgency(mine);
  }, [assignments, settings.email]);

  const pending = myAssignments.filter((a) => a.status === "pending");
  const active = myAssignments.filter((a) => a.status === "in_progress");
  const done = myAssignments.filter((a) => a.status === "completed");

  const handleOpen = async (assignment: Assignment) => {
    if (assignment.activeRunId && assignment.status === "in_progress") {
      router.push(`/run/${assignment.activeRunId}`);
      return;
    }
    const run = await startAssignment(assignment.id);
    if (run) router.push(`/run/${run.id}`);
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="Kitchen Crew"
        title={`Welcome, ${settings.employeeName}`}
        description="Your assigned kitchen audits and compliance checklists."
      />

      {active.length > 0 && (
        <section className="mb-8">
          <h2 className="section-title mb-4">Continue Audit</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {active.map((assignment) => (
              <AssignmentCard
                key={assignment.id}
                assignment={assignment}
                getTemplateById={getTemplateById}
                actionLabel="Continue Audit"
                onAction={() => handleOpen(assignment)}
              />
            ))}
          </div>
        </section>
      )}

      <section className="mb-8">
        <h2 className="section-title mb-4">Assigned to You</h2>
        {pending.length === 0 && active.length === 0 ? (
          <div className="glass-panel p-8 text-center">
            <ClipboardList className="mx-auto h-10 w-10 text-slate-400" />
            <p className="mt-3 font-semibold text-slate-800">No audits assigned yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Your kitchen manager will assign opening, line, and safety audits here.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {pending.map((assignment) => (
              <AssignmentCard
                key={assignment.id}
                assignment={assignment}
                getTemplateById={getTemplateById}
                actionLabel="Start Audit"
                onAction={() => handleOpen(assignment)}
              />
            ))}
          </div>
        )}
      </section>

      {done.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="section-title">Completed Audits</h2>
            <Link href="/history" className="text-sm font-semibold text-brand-600">
              Full history
            </Link>
          </div>
          <div className="glass-panel divide-y divide-slate-100">
            {done.slice(0, 5).map((a) => {
              const template = getTemplateById(a.templateId);
              return (
                <div key={a.id} className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {a.templateName ?? template?.name ?? "Audit"}
                    </p>
                    <p className="text-xs text-slate-500">
                      Assigned by {a.assignedByName}
                    </p>
                  </div>
                  <AssignmentStatusBadge status="completed" />
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
  assignment,
  getTemplateById,
  actionLabel,
  onAction,
}: {
  assignment: Assignment;
  getTemplateById: (id: string) => ChecklistTemplate | undefined;
  actionLabel: string;
  onAction: () => void;
}) {
  const template = getTemplateById(assignment.templateId);
  if (!template && !assignment.templateName) return null;

  const name = assignment.templateName ?? template!.name;
  const description = template?.description ?? "";
  const category = assignment.templateCategory ?? template?.category;
  const overdue = isAssignmentOverdue(assignment);

  return (
    <article
      className={`glass-panel overflow-hidden border-l-4 ${
        overdue ? "border-l-rose-500" : "border-l-brand-500"
      }`}
    >
      <div className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-xl font-bold text-slate-900">{name}</h3>
          {category && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">
              {categoryLabel(category)}
            </span>
          )}
          <AssignmentStatusBadge status={assignment.status} overdue={overdue} />
        </div>
        <p className="mt-2 text-sm text-slate-600">{description}</p>
        <div className="mt-3 flex items-center gap-1 text-xs text-slate-500">
          <User className="h-3.5 w-3.5" />
          Assigned by {assignment.assignedByName}
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
          <span className="rounded-lg bg-slate-100 px-2.5 py-1">
            {template?.items.length ?? "—"} tasks
          </span>
          {template && (
            <span className="rounded-lg bg-slate-100 px-2.5 py-1">
              ~{template.estimatedMinutes} min
            </span>
          )}
          {assignment.dueDate && (
            <span
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 ${
                overdue ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              Due {formatDate(assignment.dueDate)}
            </span>
          )}
        </div>
        {assignment.notes && (
          <p className="mt-3 rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-800">
            {assignment.notes}
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
