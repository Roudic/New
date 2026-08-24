"use client";

import { PageHeader } from "@/components/PageHeader";
import { StatusChip } from "@/components/scorecard/ScorecardChrome";
import { useScorecard } from "@/hooks/useScorecard";
import { activeYearMonth, goalsForYear } from "@/lib/scorecard/calculations";
import { formatScore, prettyDate } from "@/lib/scorecard/format";
import { OSAT_ATTRIBUTES, type DailyRow } from "@/lib/scorecard/types";

function hasCems(row: DailyRow): boolean {
  return row.kind === "day" && (row.osat != null || row.osatAccuracy != null || row.osatTaste != null);
}

export default function CemsPage() {
  const { state } = useScorecard();
  const { year } = activeYearMonth(state);
  const goals = goalsForYear(state, year);
  const rows = state.days.filter(hasCems);
  const latest = rows.at(-1);
  const attributes = OSAT_ATTRIBUTES.filter((attr) => attr.key !== "osat");
  const scores = attributes
    .map((attr) => ({
      ...attr,
      value: latest ? (latest[attr.key] as number | undefined) : undefined,
    }))
    .filter((attr) => attr.value != null);
  const worst = [...scores].sort((a, b) => (a.value ?? 100) - (b.value ?? 100)).slice(0, 3);
  const trendMax = Math.max(100, ...rows.map((row) => row.osat ?? 0), goals.osatGoal);

  return (
    <>
      <PageHeader
        eyebrow="CEMS"
        title="Guest experience"
        description="Upload the CEMS PDF from email or Pathway — it is not a spreadsheet CSV. Scores land on the report date. Bars are measured against the OSAT goal."
      />

      <section className="mb-6 grid gap-4 lg:grid-cols-3">
        <article className="glass-panel p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">OSAT</p>
          <p className="mt-2 text-4xl font-bold text-slate-900">{formatScore(latest?.osat)}</p>
          <p className="mt-1 text-sm text-slate-500">
            Goal {formatScore(goals.osatGoal)}
            {latest ? ` · ${prettyDate(latest.date)}` : ""}
          </p>
          <div className="mt-3">
            <StatusChip
              status={
                latest?.osat == null ? "na" : latest.osat >= goals.osatGoal ? "on_track" : "behind"
              }
            />
          </div>
        </article>
        <article className="glass-panel p-5 lg:col-span-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
            Worst attributes
          </p>
          <ul className="mt-3 space-y-2">
            {worst.map((attr) => (
              <li key={attr.key} className="flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-800">{attr.label}</span>
                <span className={ (attr.value ?? 0) < goals.osatGoal ? "font-semibold text-rose-700" : "font-semibold text-emerald-700"}>
                  {formatScore(attr.value)}
                </span>
              </li>
            ))}
            {worst.length === 0 && <li className="text-sm text-slate-500">No attribute scores yet.</li>}
          </ul>
        </article>
      </section>

      <section className="glass-panel mb-6 p-5">
        <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
          Attributes vs {formatScore(goals.osatGoal)} goal
        </p>
        <div className="space-y-3">
          {OSAT_ATTRIBUTES.map((attr) => {
            const value = latest ? (latest[attr.key] as number | undefined) : undefined;
            const width = Math.max(0, Math.min(100, value ?? 0));
            const behind = value != null && value < goals.osatGoal;
            return (
              <div key={attr.key}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-700">{attr.label}</span>
                  <span className={behind ? "text-rose-700" : "text-slate-600"}>{formatScore(value)}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${behind ? "bg-cfa" : "bg-emerald-500"}`}
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="glass-panel p-5">
        <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">OSAT trend</p>
        <div className="flex h-40 items-end gap-2">
          {rows.map((row) => (
            <div key={`${row.date}-${row.kind}`} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <div
                className="w-full max-w-8 rounded-t bg-cfa"
                style={{ height: `${((row.osat ?? 0) / trendMax) * 100}%` }}
                title={`${row.date} ${formatScore(row.osat)}`}
              />
              <span className="text-[10px] font-semibold text-slate-500">{row.date.slice(5)}</span>
            </div>
          ))}
          {rows.length === 0 && <p className="text-sm text-slate-500">Upload a CEMS PDF or CSV to plot OSAT.</p>}
        </div>
      </section>
    </>
  );
}
