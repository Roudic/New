import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { ProgressRing } from "@/components/ProgressRing";
import {
  categoryLabel,
  formatTime,
  getRunProgress,
  scheduleLabel,
} from "@/lib/utils";
import type { ChecklistRun, ChecklistTemplate } from "@/lib/types";

interface ChecklistCardProps {
  template: ChecklistTemplate;
  run?: ChecklistRun;
  showStart?: boolean;
}

export function ChecklistCard({
  template,
  run,
  showStart = false,
}: ChecklistCardProps) {
  const progress = run ? getRunProgress(template, run) : null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start gap-4">
        {progress && (
          <ProgressRing percent={progress.percent} size={52} strokeWidth={4} />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-brand-700">
              {categoryLabel(template.category)}
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
              {scheduleLabel(template.schedule)}
            </span>
          </div>
          <h3 className="mt-2 text-lg font-bold text-slate-900">
            {template.name}
          </h3>
          <p className="mt-1 line-clamp-2 text-sm text-slate-600">
            {template.description}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />~{template.estimatedMinutes} min
            </span>
            <span>{template.items.length} tasks</span>
            {run && (
              <span>
                Started {formatTime(run.startedAt)} by {run.startedBy}
              </span>
            )}
            {progress && (
              <span className="font-medium text-brand-600">
                {progress.completed}/{progress.total} complete
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        {run ? (
          <Link
            href={`/run/${run.id}`}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : showStart ? (
          <Link
            href={`/checklists/${template.id}`}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            Start Checklist
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : null}
      </div>
    </div>
  );
}
