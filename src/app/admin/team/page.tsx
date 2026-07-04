"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Mail, UserCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { useApp } from "@/context/AppContext";

export default function AdminTeamPage() {
  const { assignments, getEmployees } = useApp();
  const employees = getEmployees();

  const team = useMemo(() => {
    return employees.map((employee) => {
      const mine = assignments.filter((a) => a.assignedToEmail === employee.email);
      const pending = mine.filter((a) => a.status === "pending").length;
      const active = mine.filter((a) => a.status === "in_progress").length;
      const done = mine.filter((a) => a.status === "completed").length;
      return {
        ...employee,
        pending,
        active,
        done,
        total: mine.length,
      };
    });
  }, [employees, assignments]);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Kitchen Crew"
        title="Team Members"
        description="Your kitchen staff and their assigned audit workload."
        backHref="/admin"
        backLabel="Dashboard"
        action={
          <Link href="/admin/assign" className="btn-primary">
            Assign Audit
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {team.map((member) => (
          <article key={member.email} className="glass-panel p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                <UserCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold text-slate-900">{member.name}</h2>
                <p className="text-sm font-medium text-brand-700">
                  {"jobTitle" in member && member.jobTitle ? member.jobTitle : "Kitchen Staff"}
                </p>
                <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                  <Mail className="h-3.5 w-3.5" />
                  {member.email}
                </p>
                <p className="mt-1 text-xs text-slate-400">{member.locationName}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-xl bg-amber-50 py-2">
                <p className="text-lg font-bold text-amber-700">{member.pending}</p>
                <p className="text-amber-600">Pending</p>
              </div>
              <div className="rounded-xl bg-sky-50 py-2">
                <p className="text-lg font-bold text-sky-700">{member.active}</p>
                <p className="text-sky-600">Active</p>
              </div>
              <div className="rounded-xl bg-emerald-50 py-2">
                <p className="text-lg font-bold text-emerald-700">{member.done}</p>
                <p className="text-emerald-600">Done</p>
              </div>
            </div>

            <Link
              href={`/admin/assign?employee=${encodeURIComponent(member.email)}`}
              className="btn-secondary mt-4 w-full text-sm"
            >
              Assign audit to {member.name.split(" ")[0]}
            </Link>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
