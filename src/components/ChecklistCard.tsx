import Link from "next/link";
import {
  ArrowRight,
  Clock,
  ListChecks,
  Pencil,
  Sparkles,
} from "lucide-react";
import { ProgressRing } from "@/components/ProgressRing";
import {
  categoryBorder,
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
  showEdit?: boolean;
}

export function ChecklistCard({
  template,
  run,
  showStart = false,
  showEdit = false,
}: ChecklistCardProps) {
  const progress = run ? getRunProgress(template, run) : null;

  return (
    <article
      className={`group overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover ${categoryBorder(template.category)} border-l-4`}
    >
      <div className="p-5">
        <div className="flex items-start gap-4">
          {progress ? (
            <ProgressRing percent={progress.percent} size={58} strokeWidth={4} />
          ) : (
            <div className="flex h-[58px] w-[58px] items-center justify-center rounded-2xl bg-slate-50 text-brand-600 ring-1 ring-slate-100">
              <ListChecks className="h-6 w-6" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-brand-700">
                {categoryLabel(template.category)}
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                {scheduleLabel(template.schedule)}
              </span>
              {template.isCustom && (
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-violet-700">
                  <Sparkles className="h-3 w-3" />
                  Yours
                </span>
              )}
            </div>

            <h3 className="mt-2 text-xl font-bold tracking-tight text-slate-900">
              {template.name}
            </h3>
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-600">
              {template.description || "No description provided."}
            </p>

            <div className="mt-4 flex flex-wrap gap-3 text-xs font-medium text-slate-500">
              <span className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2.5 py-1">
                <Clock className="h-3.5 w-3.5" />~{template.estimatedMinutes} min
              </span>
              <span className="rounded-lg bg-slate-50 px-2.5 py-1">
                {template.items.length} tasks
              </span>
              {run && (
                <span className="rounded-lg bg-slate-50 px-2.5 py-1">
                  Started {formatTime(run.startedAt)} · {run.startedBy}
                </span>
              )}
              {progress && (
                <span className="rounded-lg bg-brand-50 px-2.5 py-1 text-brand-700">
                  {progress.completed}/{progress.total} complete
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 border-t border-slate-100 bg-slate-50/60 p-4">
        {run ? (
          <Link href={`/run/${run.id}`} className="btn-primary flex-1">
            Continue Checklist
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : showStart ? (
          <>
            <Link
              href={`/checklists/${template.id}`}
              className="btn-primary flex-1"
            >
              View & Start
              <ArrowRight className="h-4 w-4" />
            </Link>
            {showEdit && template.isCustom && (
              <Link
                href={`/checklists/${template.id}/edit`}
                className="btn-secondary px-3"
                aria-label="Edit checklist"
              >
                <Pencil className="h-4 w-4" />
              </Link>
            )}
          </>
        ) : null}
      </div>
    </article>
  );
}
