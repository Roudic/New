"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight, ClipboardList } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { categoryBorder, categoryLabel, formatDateTime } from "@/lib/utils";

interface RunSummary {
  id: string;
  templateName: string;
  category: string;
  status: string;
  startedAt: string;
  completedAt?: string;
}

export default function HistoryPage() {
  const [runs, setRuns] = useState<RunSummary[]>([]);

  useEffect(() => {
    fetch("/api/runs")
      .then((r) => r.json())
      .then((data) => setRuns(data))
      .catch(() => setRuns([]));
  }, []);

  const completed = runs.filter((r) => r.status === "completed");

  return (
    <AppShell>
      <PageHeader
        eyebrow="Audit Trail"
        title="Completion History"
        description="Full record of checklist runs with employee accountability on every task."
      />

      {completed.length === 0 ? (
        <div className="glass-panel px-6 py-14 text-center">
          <ClipboardList className="mx-auto h-10 w-10 text-slate-400" />
          <p className="mt-4 font-bold text-slate-900">No completed runs yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {completed.map((run) => (
            <Link
              key={run.id}
              href={`/run/${run.id}`}
              className={`group block overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover ${categoryBorder(run.category)} border-l-4`}
            >
              <div className="flex items-center justify-between gap-4 p-5">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900">
                      {run.templateName}
                    </h3>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase text-slate-600">
                      {categoryLabel(run.category)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    Completed {run.completedAt ? formatDateTime(run.completedAt) : "—"}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-brand-600" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
