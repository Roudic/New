"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  PlayCircle,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AssignmentStatusBadge } from "@/components/AssignmentStatusBadge";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { useApp } from "@/context/AppContext";
import { isAssignmentOverdue } from "@/lib/assignments";
import { categoryLabel, formatDateTime } from "@/lib/utils";

export default function AdminDashboardPage() {
  const { assignments, runs, settings, getEmployees, getTemplateById } = useApp();
  const employees = getEmployees();

  const stats = useMemo(() => {
    const pending = assignments.filter((a) => a.status === "pending").length;
    const inProgress = assignments.filter((a) => a.status === "in_progress").length;
    const completed = assignments.filter((a) => a.status === "completed").length;
    const overdue = assignments.filter((a) => isAssignmentOverdue(a)).length;

    const employeeStats = employees.map((employee) => {
      const mine = assignments.filter(
        (a) => a.assignedToEmail === employee.email
      );
      const done = mine.filter((a) => a.status === "completed").length;
      const total = mine.length;
      const active = mine.filter((a) => a.status === "in_progress").length;
      return {
        ...employee,
        assigned: total,
        active,
        completed: done,
        completionRate: total === 0 ? 0 : Math.round((done / total) * 100),
      };
    });

    return { pending, inProgress, completed, overdue, employeeStats };
  }, [assignments, employees]);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Kitchen Manager"
        title={`${settings.locationName} — Audit Dashboard`}
        description="Track kitchen audits, crew assignments, and compliance completion in real time."
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/assignments" className="btn-secondary">
              All Assignments
            </Link>
            <Link href="/admin/assign" className="btn-primary">
              Assign Audit
            </Link>
          </div>
        }
      />

      <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Pending" value={stats.pending} icon={AlertTriangle} accent="amber" />
        <StatCard label="In Progress" value={stats.inProgress} icon={PlayCircle} accent="blue" />
        <StatCard label="Completed" value={stats.completed} icon={CheckCircle2} accent="green" />
        <StatCard label="Overdue" value={stats.overdue} icon={AlertTriangle} accent="amber" />
        <StatCard label="Kitchen Crew" value={stats.employeeStats.length} icon={Users} accent="violet" />
      </section>

      <section className="mb-8 grid gap-6 lg:grid-cols-2">
        <div className="glass-panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h2 className="section-title">Crew Progress</h2>
            <Link href="/admin/team" className="text-sm font-semibold text-brand-600">
              View team
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {stats.employeeStats.map((employee) => (
              <div key={employee.email} className="px-6 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{employee.name}</p>
                    <p className="text-sm text-slate-500">
                      {"jobTitle" in employee && employee.jobTitle
                        ? `${employee.jobTitle} · `
                        : ""}
                      {employee.email}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {employee.active} active · {employee.assigned} assigned
                    </p>
                  </div>
                  <p className="text-lg font-bold text-brand-600">
                    {employee.completionRate}%
                  </p>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-brand-500 transition-all"
                    style={{ width: `${employee.completionRate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel overflow-hidden">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="section-title">Recent Assignments</h2>
          </div>
          <ul className="divide-y divide-slate-100">
            {assignments.slice(0, 6).map((item) => {
              const template = getTemplateById(item.templateId);
              const name = item.templateName ?? template?.name ?? "Audit";
              const category = item.templateCategory ?? template?.category;
              return (
                <li key={item.id} className="px-6 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{name}</p>
                      <p className="text-sm text-slate-500">
                        → {item.assignedToName}
                        {category && (
                          <span className="ml-2 text-xs text-slate-400">
                            {categoryLabel(category)}
                          </span>
                        )}
                      </p>
                    </div>
                    <AssignmentStatusBadge
                      status={item.status}
                      overdue={isAssignmentOverdue(item)}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="glass-panel overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="section-title">Recent Audit Activity</h2>
        </div>
        <ul className="divide-y divide-slate-100">
          {runs.slice(0, 6).map((run) => (
            <li key={run.id}>
              <Link
                href={`/run/${run.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-slate-50"
              >
                <div className="flex items-center gap-3">
                  <ClipboardList className="h-4 w-4 text-slate-500" />
                  <div>
                    <p className="font-semibold text-slate-900">{run.templateName}</p>
                    <p className="text-sm text-slate-500">
                      {run.startedBy} · {formatDateTime(run.startedAt)}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold uppercase text-slate-500">
                  {run.status.replace("_", " ")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </AppShell>
  );
}
