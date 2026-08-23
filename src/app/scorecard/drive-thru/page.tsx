"use client";

import { PageHeader } from "@/components/PageHeader";
import { useScorecard } from "@/hooks/useScorecard";
import { activeYearMonth, goalsForYear, operatingDays, sosBand } from "@/lib/scorecard/calculations";
import { formatPercent, formatSos } from "@/lib/scorecard/format";

function variance(seconds: number | undefined, goalSec: number): number | null {
  if (seconds == null) return null;
  return ((seconds - goalSec) / goalSec) * 100;
}

function Band({ seconds }: { seconds?: number }) {
  const band = sosBand(seconds);
  const cls = {
    good: "bg-emerald-50 text-emerald-700",
    watch: "bg-amber-50 text-amber-800",
    hot: "bg-rose-50 text-rose-700",
    na: "bg-slate-100 text-slate-500",
  }[band];
  return <span className={`rounded-lg px-2 py-1 text-sm font-semibold ${cls}`}>{formatSos(seconds)}</span>;
}

export default function DriveThruPage() {
  const { state } = useScorecard();
  const { year } = activeYearMonth(state);
  const goals = goalsForYear(state, year);
  const goalSec = goals.dtSosGoalMin * 60;
  const rows = operatingDays(state.days).filter((d) => d.dtSosTotalSec || d.dtSosBreakfastSec);

  const avg = (key: "dtSosTotalSec" | "dtSosBreakfastSec" | "dtSosLunchSec" | "dtSosDinnerSec") => {
    const values = rows.map((r) => r[key]).filter((n): n is number => n != null);
    if (!values.length) return undefined;
    return values.reduce((s, n) => s + n, 0) / values.length;
  };

  return (
    <>
      <PageHeader
        eyebrow="Drive-Thru Deep Dive"
        title="Speed of service by daypart"
        description={`Average total time versus a ${goals.dtSosGoalMin}:00 goal (${goalSec} seconds). Green is at or under goal, amber is 5:00–7:30, red is over 7:30.`}
      />

      <section className="mb-6 grid gap-4 md:grid-cols-4">
        <Daypart label="Total" seconds={avg("dtSosTotalSec")} goalSec={goalSec} />
        <Daypart label="Breakfast" seconds={avg("dtSosBreakfastSec")} goalSec={goalSec} />
        <Daypart label="Lunch" seconds={avg("dtSosLunchSec")} goalSec={goalSec} />
        <Daypart label="Dinner" seconds={avg("dtSosDinnerSec")} goalSec={goalSec} />
      </section>

      <div className="glass-panel overflow-x-auto">
        <table className="min-w-[720px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-3">Date</th>
              <th className="px-3 py-3">Total</th>
              <th className="px-3 py-3">vs Goal</th>
              <th className="px-3 py-3">Breakfast</th>
              <th className="px-3 py-3">Lunch</th>
              <th className="px-3 py-3">Dinner</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.date}>
                <td className="px-3 py-2.5 font-medium">
                  {row.date.slice(5)}{" "}
                  <span className="text-slate-400">{row.dayOfWeek.slice(0, 3)}</span>
                </td>
                <td className="px-3 py-2.5">
                  <Band seconds={row.dtSosTotalSec} />
                </td>
                <td className="px-3 py-2.5 text-slate-600">
                  {formatPercent(variance(row.dtSosTotalSec, goalSec))}
                </td>
                <td className="px-3 py-2.5">
                  <Band seconds={row.dtSosBreakfastSec} />
                </td>
                <td className="px-3 py-2.5">
                  <Band seconds={row.dtSosLunchSec} />
                </td>
                <td className="px-3 py-2.5">
                  <Band seconds={row.dtSosDinnerSec} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Daypart({
  label,
  seconds,
  goalSec,
}: {
  label: string;
  seconds?: number;
  goalSec: number;
}) {
  const vs = seconds != null ? ((seconds - goalSec) / goalSec) * 100 : null;
  return (
    <article className="glass-panel p-5">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{formatSos(seconds)}</p>
      <p className="mt-1 text-xs font-medium text-slate-500">
        vs {formatSos(goalSec)} · {formatPercent(vs)}
      </p>
    </article>
  );
}
