"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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

interface AdminStats {
  totals: {
    employees: number;
    templates: number;
    pending: number;
    inProgress: number;
    completed: number;
    completedRuns: number;
  };
  employeeStats: Array<{
    id: string;
    name: string;
    email: string;
    locationName: string;
    assigned: number;
    completed: number;
    completionRate: number;
  }>;
  recentAssignments: Array<{
    id: string;
    templateName: string;
    assigneeName: string;
    status: string;
    dueDate?: string;
    createdAt: string;
  }>;
  recentRuns: Array<{
    id: string;
    templateName: string;
    userName: string;
    status: string;
    startedAt: string;
    completedAt?: string;
  }>;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Admin Dashboard"
        title="Team Progress"
        description="Track assignments, monitor completion rates, and see what your team is working on in real time."
        action={
          <Link href="/admin/assign" className="btn-primary">
            Assign Checklist
          </Link>
        }
      />

      <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Pending"
          value={stats?.totals.pending ?? "—"}
          icon={AlertTriangle}
          accent="amber"
          hint="Awaiting start"
        />
        <StatCard
          label="In Progress"
          value={stats?.totals.inProgress ?? "—"}
          icon={PlayCircle}
          accent="blue"
          hint="Active assignments"
        />
        <StatCard
          label="Completed"
          value={stats?.totals.completed ?? "—"}
          icon={CheckCircle2}
          accent="green"
          hint="Finished assignments"
        />
        <StatCard
          label="Team Members"
          value={stats?.totals.employees ?? "—"}
          icon={Users}
          accent="violet"
          hint={`${stats?.totals.templates ?? 0} checklists`}
        />
      </section>

      <section className="mb-8 grid gap-6 lg:grid-cols-2">
        <div className="glass-panel overflow-hidden">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="section-title">Employee Progress</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {(stats?.employeeStats ?? []).map((employee) => (
              <div key={employee.id} className="px-6 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{employee.name}</p>
                    <p className="text-sm text-slate-500">{employee.locationName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-brand-600">
                      {employee.completionRate}%
                    </p>
                    <p className="text-xs text-slate-500">
                      {employee.completed}/{employee.assigned} done
                    </p>
                  </div>
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
            {(stats?.recentAssignments ?? []).map((item) => (
              <li key={item.id} className="px-6 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{item.templateName}</p>
                    <p className="text-sm text-slate-500">Assigned to {item.assigneeName}</p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                      item.status === "completed"
                        ? "bg-emerald-50 text-emerald-700"
                        : item.status === "in_progress"
                          ? "bg-brand-50 text-brand-700"
                          : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {item.status.replace("_", " ")}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="glass-panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="section-title">Recent Activity</h2>
          <Link href="/history" className="text-sm font-semibold text-brand-600">
            View all
          </Link>
        </div>
        <ul className="divide-y divide-slate-100">
          {(stats?.recentRuns ?? []).map((run) => (
            <li key={run.id}>
              <Link
                href={`/run/${run.id}`}
                className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-slate-50"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-slate-100 p-2 text-slate-600">
                    <ClipboardList className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{run.templateName}</p>
                    <p className="text-sm text-slate-500">{run.userName}</p>
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
