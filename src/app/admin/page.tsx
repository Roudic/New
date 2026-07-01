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
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { useApp } from "@/context/AppContext";
import { getDemoEmployees } from "@/lib/demo-users";
export default function AdminDashboardPage() {
  const { assignments, runs, settings } = useApp();

  const stats = useMemo(() => {
    const employees = getDemoEmployees();
    const pending = assignments.filter((a) => a.status === "pending").length;
    const inProgress = assignments.filter((a) => a.status === "in_progress").length;
    const completed = assignments.filter((a) => a.status === "completed").length;

    const employeeStats = employees.map((employee) => {
      const mine = assignments.filter(
        (a) => a.assignedToEmail === employee.email
      );
      const done = mine.filter((a) => a.status === "completed").length;
      const total = mine.length;
      return {
        ...employee,
        assigned: total,
        completed: done,
        completionRate: total === 0 ? 0 : Math.round((done / total) * 100),
      };
    });

    return { pending, inProgress, completed, employeeStats };
  }, [assignments]);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Admin Dashboard"
        title={`Team Progress — ${settings.locationName}`}
        description="Track assignments and completion rates. Data is saved on this device."
        action={
          <Link href="/admin/assign" className="btn-primary">
            Assign Checklist
          </Link>
        }
      />

      <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Pending" value={stats.pending} icon={AlertTriangle} accent="amber" />
        <StatCard label="In Progress" value={stats.inProgress} icon={PlayCircle} accent="blue" />
        <StatCard label="Completed" value={stats.completed} icon={CheckCircle2} accent="green" />
        <StatCard label="Team" value={stats.employeeStats.length} icon={Users} accent="violet" />
      </section>

      <section className="mb-8 grid gap-6 lg:grid-cols-2">
        <div className="glass-panel overflow-hidden">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="section-title">Employee Progress</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {stats.employeeStats.map((employee) => (
              <div key={employee.email} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{employee.name}</p>
                    <p className="text-sm text-slate-500">{employee.email}</p>
                  </div>
                  <p className="text-lg font-bold text-brand-600">
                    {employee.completionRate}%
                  </p>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-brand-500"
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
            {assignments.slice(0, 6).map((item) => (
              <li key={item.id} className="px-6 py-4">
                <p className="font-semibold text-slate-900">
                  Assigned to {item.assignedToName}
                </p>
                <p className="text-sm capitalize text-slate-500">
                  {item.status.replace("_", " ")}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="glass-panel overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="section-title">Recent Activity</h2>
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
                    <p className="text-sm text-slate-500">{run.startedBy}</p>
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
