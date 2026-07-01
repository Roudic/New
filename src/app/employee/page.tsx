"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Calendar, ClipboardList } from "lucide-react";
import { useSession } from "next-auth/react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { formatDate } from "@/lib/utils";

interface Assignment {
  id: string;
  status: string;
  dueDate?: string;
  notes?: string;
  activeRunId?: string;
  template: {
    id: string;
    name: string;
    description: string;
    estimatedMinutes: number;
    items: unknown[];
  };
}

export default function EmployeeDashboardPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  useEffect(() => {
    fetch("/api/assignments")
      .then((r) => r.json())
      .then(setAssignments)
      .catch(() => setAssignments([]));
  }, []);

  const startAssignment = async (assignment: Assignment) => {
    if (assignment.activeRunId) {
      router.push(`/run/${assignment.activeRunId}`);
      return;
    }

    const res = await fetch("/api/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignmentId: assignment.id }),
    });

    const run = await res.json();
    router.push(`/run/${run.id}`);
  };

  const pending = assignments.filter((a) => a.status === "pending");
  const active = assignments.filter((a) => a.status === "in_progress");
  const done = assignments.filter((a) => a.status === "completed");

  return (
    <AppShell>
      <PageHeader
        eyebrow="My Work"
        title={`Welcome, ${session?.user?.name ?? "Team Member"}`}
        description="Complete the checklists assigned to you. Every task is timestamped with your name."
      />

      {active.length > 0 && (
        <section className="mb-8">
          <h2 className="section-title mb-4">Continue Working</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {active.map((assignment) => (
              <AssignmentCard
                key={assignment.id}
                assignment={assignment}
                onStart={() => startAssignment(assignment)}
                actionLabel="Continue"
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
            <p className="mt-3 font-semibold text-slate-800">
              No pending assignments
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Your manager will assign checklists here.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {pending.map((assignment) => (
              <AssignmentCard
                key={assignment.id}
                assignment={assignment}
                onStart={() => startAssignment(assignment)}
                actionLabel="Start Checklist"
              />
            ))}
          </div>
        )}
      </section>

      {done.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="section-title">Recently Completed</h2>
            <Link href="/history" className="text-sm font-semibold text-brand-600">
              View history
            </Link>
          </div>
          <div className="glass-panel divide-y divide-slate-100">
            {done.slice(0, 5).map((assignment) => (
              <div key={assignment.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="font-semibold text-slate-900">
                    {assignment.template.name}
                  </p>
                  <p className="text-sm text-slate-500">Completed</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                  Done
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </AppShell>
  );
}

function AssignmentCard({
  assignment,
  onStart,
  actionLabel,
}: {
  assignment: Assignment;
  onStart: () => void;
  actionLabel: string;
}) {
  return (
    <article className="glass-panel overflow-hidden border-l-4 border-l-brand-500">
      <div className="p-5">
        <h3 className="text-xl font-bold text-slate-900">
          {assignment.template.name}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          {assignment.template.description}
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
          <span className="rounded-lg bg-slate-100 px-2.5 py-1">
            {assignment.template.items.length} tasks
          </span>
          <span className="rounded-lg bg-slate-100 px-2.5 py-1">
            ~{assignment.template.estimatedMinutes} min
          </span>
          {assignment.dueDate && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1 text-amber-700">
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
        <button type="button" onClick={onStart} className="btn-primary w-full">
          {actionLabel}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}
