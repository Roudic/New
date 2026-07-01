"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Plus,
  PlayCircle,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ChecklistCard } from "@/components/ChecklistCard";
import { StatCard } from "@/components/StatCard";
import { useApp } from "@/context/AppContext";
import { getAllTemplates } from "@/lib/checklists";
import { getActiveRuns, getCompletedRuns } from "@/lib/storage";
import { formatDate } from "@/lib/utils";

export default function DashboardPage() {
  const { settings, runs, customChecklists, getTemplateById } = useApp();
  const allTemplates = useMemo(
    () => getAllTemplates(customChecklists),
    [customChecklists]
  );
  const activeRuns = getActiveRuns(runs);
  const completedRuns = getCompletedRuns(runs);
  const today = new Date().toDateString();
  const completedToday = completedRuns.filter(
    (r) => r.completedAt && new Date(r.completedAt).toDateString() === today
  ).length;

  const dueTemplates = allTemplates.filter((template) => {
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
      <section className="glass-panel mb-8 overflow-hidden">
        <div className="bg-gradient-to-r from-brand-700 via-brand-600 to-teal-600 px-6 py-8 text-white sm:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">
            Operations Dashboard
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            {settings.locationName}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/85 sm:text-base">
            {settings.employeeName ? (
              <>
                Signed in as{" "}
                <span className="font-semibold text-white">
                  {settings.employeeName}
                </span>
                . Track due checklists, active runs, and completion history.
              </>
            ) : (
              <>
                Set your name in{" "}
                <Link
                  href="/settings"
                  className="font-semibold underline underline-offset-4"
                >
                  Settings
                </Link>{" "}
                so every completed task is stamped with your name.
              </>
            )}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/checklists/new"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-brand-700 shadow-sm transition hover:bg-brand-50"
            >
              <Plus className="h-4 w-4" />
              Create Checklist
            </Link>
            <Link
              href="/checklists"
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/15"
            >
              Browse Library
            </Link>
          </div>
        </div>
      </section>

      <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="In Progress"
          value={activeRuns.length}
          icon={PlayCircle}
          accent="blue"
          hint="Active checklist runs"
        />
        <StatCard
          label="Completed Today"
          value={completedToday}
          icon={CheckCircle2}
          accent="green"
          hint="Finished since midnight"
        />
        <StatCard
          label="Due Now"
          value={dueTemplates.length}
          icon={AlertTriangle}
          accent="amber"
          hint="Not yet completed today"
        />
        <StatCard
          label="Your Checklists"
          value={customChecklists.length}
          icon={Sparkles}
          accent="violet"
          hint={`${allTemplates.length} total available`}
        />
      </section>

      {activeRuns.length > 0 && (
        <section className="mb-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="section-title">Active Checklists</h2>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
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
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="section-title">Due Checklists</h2>
          <Link
            href="/checklists"
            className="text-sm font-semibold text-brand-600 hover:text-brand-700"
          >
            View all
          </Link>
        </div>
        {dueTemplates.length === 0 ? (
          <div className="glass-panel p-8 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
            <p className="mt-3 text-lg font-bold text-slate-900">
              You&apos;re caught up for today
            </p>
            <p className="mt-1 text-sm text-slate-600">
              All scheduled checklists are complete. Nice work.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {dueTemplates.slice(0, 4).map((template) => (
              <ChecklistCard
                key={template.id}
                template={template}
                showStart
                showEdit
              />
            ))}
          </div>
        )}
      </section>

      {customChecklists.length > 0 && (
        <section className="mb-10">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="section-title">Your Custom Checklists</h2>
            <Link
              href="/checklists?tab=mine"
              className="text-sm font-semibold text-brand-600 hover:text-brand-700"
            >
              Manage
            </Link>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            {customChecklists.slice(0, 2).map((template) => (
              <ChecklistCard
                key={template.id}
                template={template}
                showStart
                showEdit
              />
            ))}
          </div>
        </section>
      )}

      {completedRuns.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="section-title">Recent Completions</h2>
            <Link
              href="/history"
              className="text-sm font-semibold text-brand-600 hover:text-brand-700"
            >
              Full history
            </Link>
          </div>
          <div className="glass-panel overflow-hidden">
            <ul className="divide-y divide-slate-100">
              {completedRuns.slice(0, 5).map((run) => (
                <li key={run.id}>
                  <Link
                    href={`/run/${run.id}`}
                    className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-slate-50"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">
                        {run.templateName}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {run.completedAt && formatDate(run.completedAt)} ·{" "}
                        {run.startedBy}
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                      Complete
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </AppShell>
  );
}
