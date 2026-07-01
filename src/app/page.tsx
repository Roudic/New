"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  PlayCircle,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ChecklistCard } from "@/components/ChecklistCard";
import { StatCard } from "@/components/StatCard";
import { useApp } from "@/context/AppContext";
import { checklistTemplates, getTemplateById } from "@/lib/templates";
import { getActiveRuns, getCompletedRuns } from "@/lib/storage";
import { formatDate } from "@/lib/utils";

export default function DashboardPage() {
  const { settings, runs } = useApp();
  const activeRuns = getActiveRuns(runs);
  const completedRuns = getCompletedRuns(runs);
  const today = new Date().toDateString();
  const completedToday = completedRuns.filter(
    (r) => r.completedAt && new Date(r.completedAt).toDateString() === today
  ).length;

  const dueTemplates = checklistTemplates.filter((template) => {
    const hasActive = activeRuns.some((r) => r.templateId === template.id);
    if (hasActive) return false;
    const completedTodayForTemplate = completedRuns.some(
      (r) =>
        r.templateId === template.id &&
        r.completedAt &&
        new Date(r.completedAt).toDateString() === today
    );
    return !completedTodayForTemplate;
  });

  return (
    <AppShell>
      <section className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
          Operations Dashboard
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
          {settings.locationName}
        </h1>
        <p className="mt-2 text-slate-600">
          {settings.employeeName ? (
            <>
              Signed in as{" "}
              <span className="font-semibold text-slate-900">
                {settings.employeeName}
              </span>
            </>
          ) : (
            <>
              Set your name in{" "}
              <Link href="/settings" className="font-semibold text-brand-600">
                Settings
              </Link>{" "}
              for task accountability.
            </>
          )}
        </p>
      </section>

      <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="In Progress"
          value={activeRuns.length}
          icon={PlayCircle}
          accent="blue"
        />
        <StatCard
          label="Completed Today"
          value={completedToday}
          icon={CheckCircle2}
          accent="green"
        />
        <StatCard
          label="Due Now"
          value={dueTemplates.length}
          icon={AlertTriangle}
          accent="amber"
        />
        <StatCard
          label="Templates"
          value={checklistTemplates.length}
          icon={ClipboardCheck}
          accent="slate"
        />
      </section>

      {activeRuns.length > 0 && (
        <section className="mb-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Active Checklists</h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {activeRuns.map((run) => {
              const template = getTemplateById(run.templateId);
              if (!template) return null;
              return (
                <ChecklistCard key={run.id} template={template} run={run} />
              );
            })}
          </div>
        </section>
      )}

      <section className="mb-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Due Checklists</h2>
          <Link
            href="/checklists"
            className="text-sm font-semibold text-brand-600 hover:text-brand-700"
          >
            View all templates
          </Link>
        </div>
        {dueTemplates.length === 0 ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />
            <p className="mt-2 font-semibold text-emerald-800">
              All scheduled checklists are complete for today.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {dueTemplates.slice(0, 4).map((template) => (
              <ChecklistCard
                key={template.id}
                template={template}
                showStart
              />
            ))}
          </div>
        )}
      </section>

      {completedRuns.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Recent Completions</h2>
            <Link
              href="/history"
              className="text-sm font-semibold text-brand-600 hover:text-brand-700"
            >
              View history
            </Link>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <ul className="divide-y divide-slate-100">
              {completedRuns.slice(0, 5).map((run) => (
                <li
                  key={run.id}
                  className="flex items-center justify-between gap-4 px-4 py-3"
                >
                  <div>
                    <p className="font-semibold text-slate-900">
                      {run.templateName}
                    </p>
                    <p className="text-sm text-slate-500">
                      {run.completedAt && formatDate(run.completedAt)} ·{" "}
                      {run.startedBy}
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    Complete
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </AppShell>
  );
}
