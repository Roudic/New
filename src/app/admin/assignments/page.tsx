"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AssignmentStatusBadge } from "@/components/AssignmentStatusBadge";
import { PageHeader } from "@/components/PageHeader";
import { useApp } from "@/context/AppContext";
import { isAssignmentOverdue, sortAssignmentsByUrgency } from "@/lib/assignments";
import { categoryLabel, formatDate } from "@/lib/utils";
import type { AssignmentStatus } from "@/lib/types";

type Filter = "all" | AssignmentStatus;

export default function AdminAssignmentsPage() {
  const { assignments, getTemplateById } = useApp();
  const [filter, setFilter] = useState<Filter>("all");

  const visible = useMemo(() => {
    const sorted = sortAssignmentsByUrgency(assignments);
    if (filter === "all") return sorted;
    return sorted.filter((a) => a.status === filter);
  }, [assignments, filter]);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Kitchen Audits"
        title="All Assignments"
        description="Every audit assigned to your kitchen crew — track status, due dates, and who owns each task."
        backHref="/admin"
        backLabel="Dashboard"
        action={
          <Link href="/admin/assign" className="btn-primary">
            New Assignment
          </Link>
        }
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {(
          [
            ["all", "All"],
            ["pending", "Pending"],
            ["in_progress", "In Progress"],
            ["completed", "Completed"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              filter === value
                ? "bg-brand-600 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {visible.map((assignment) => {
          const template = getTemplateById(assignment.templateId);
          const name = assignment.templateName ?? template?.name ?? "Audit";
          const category = assignment.templateCategory ?? template?.category;
          const overdue = isAssignmentOverdue(assignment);

          return (
            <article
              key={assignment.id}
              className={`glass-panel p-5 ${overdue ? "ring-2 ring-rose-200" : ""}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900">{name}</h2>
                    {category && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                        {categoryLabel(category)}
                      </span>
                    )}
                    <AssignmentStatusBadge status={assignment.status} overdue={overdue} />
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    Assigned to{" "}
                    <strong className="text-slate-800">{assignment.assignedToName}</strong>
                    {assignment.assignedToLocation && (
                      <span className="text-slate-400">
                        {" "}
                        · {assignment.assignedToLocation}
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Assigned by {assignment.assignedByName}
                    {assignment.dueDate && (
                      <span className={overdue ? " font-semibold text-rose-600" : ""}>
                        {" "}
                        · Due {formatDate(assignment.dueDate)}
                      </span>
                    )}
                  </p>
                  {assignment.notes && (
                    <p className="mt-2 rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-800">
                      {assignment.notes}
                    </p>
                  )}
                </div>
                {assignment.activeRunId && assignment.status === "in_progress" && (
                  <Link
                    href={`/run/${assignment.activeRunId}`}
                    className="btn-secondary shrink-0 text-sm"
                  >
                    View run
                  </Link>
                )}
              </div>
            </article>
          );
        })}

        {visible.length === 0 && (
          <div className="glass-panel p-10 text-center text-slate-500">
            No assignments in this view yet.
          </div>
        )}
      </div>
    </AppShell>
  );
}
