"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useScorecard } from "@/hooks/useScorecard";
import { enrichDay, goalsForYear, hasMeaningfulData } from "@/lib/scorecard/calculations";
import { formatMoney, formatPercent, formatScore, formatSos } from "@/lib/scorecard/format";
import { monthLabel } from "@/lib/scorecard/values";

export default function DailyScorecardPage() {
  const { state } = useScorecard();
  const months = useMemo(() => {
    const keys = new Set(state.days.map((d) => d.date.slice(0, 7)));
    return Array.from(keys).sort().reverse();
  }, [state.days]);
  const [month, setMonth] = useState(months[0] ?? "2026-06");
  const [onlyFilled, setOnlyFilled] = useState(true);

  const [yearNum] = month.split("-").map(Number);
  const goals = goalsForYear(state, yearNum);
  const rows = state.days
    .filter((d) => d.date.startsWith(month))
    .filter((d) => (onlyFilled ? hasMeaningfulData(d) : true))
    .map((d) => enrichDay(d, goals));

  return (
    <>
      <PageHeader
        eyebrow="Daily Data"
        title="Operating days"
        description="One row per day. A 15-minute CSV from your phone is added up to that day's sales and transactions. Closed Sundays stay out of the averages."
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="text-sm font-semibold text-slate-600">
          Month
          <select
            className="field-input ml-2 w-auto"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          >
            {months.map((value) => {
              const [y, m] = value.split("-").map(Number);
              return (
                <option key={value} value={value}>
                  {monthLabel(m)} {y}
                </option>
              );
            })}
          </select>
        </label>
        <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
          <input
            type="checkbox"
            checked={onlyFilled}
            onChange={(e) => setOnlyFilled(e.target.checked)}
          />
          Hide empty days
        </label>
        <p className="text-sm text-slate-500">{rows.length} rows</p>
      </div>

      <div className="glass-panel overflow-x-auto">
        <table className="min-w-[1100px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-3">Date</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Sales</th>
              <th className="px-3 py-3">vs Goal</th>
              <th className="px-3 py-3">Labor $</th>
              <th className="px-3 py-3">Labor %</th>
              <th className="px-3 py-3">Trans</th>
              <th className="px-3 py-3">OSAT</th>
              <th className="px-3 py-3">SOS</th>
              <th className="px-3 py-3">B / L / D</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr
                key={`${row.date}-${row.kind}`}
                className={row.kind === "week" ? "bg-slate-50 font-semibold" : ""}
              >
                <td className="px-3 py-2.5">
                  {row.date.slice(5)}{" "}
                  <span className="text-slate-400">{row.dayOfWeek.slice(0, 3)}</span>
                </td>
                <td className="px-3 py-2.5">{row.kind === "week" ? "Week" : row.status}</td>
                <td className="px-3 py-2.5">{formatMoney(row.salesActual)}</td>
                <td
                  className={`px-3 py-2.5 ${
                    (row.salesVsGoal ?? 0) < 0 ? "text-rose-600" : "text-emerald-700"
                  }`}
                >
                  {formatMoney(row.salesVsGoal)}
                </td>
                <td className="px-3 py-2.5">{formatMoney(row.laborActual)}</td>
                <td
                  className={`px-3 py-2.5 ${
                    row.laborPct != null && row.laborPct > goals.laborTargetPct
                      ? "text-rose-600"
                      : "text-emerald-700"
                  }`}
                >
                  {formatPercent(row.laborPct)}
                </td>
                <td className="px-3 py-2.5">{row.transTy?.toLocaleString() ?? "—"}</td>
                <td className="px-3 py-2.5">{formatScore(row.osat)}</td>
                <td className="px-3 py-2.5">{formatSos(row.dtSosTotalSec)}</td>
                <td className="px-3 py-2.5 text-xs text-slate-500">
                  {formatSos(row.dtSosBreakfastSec)} / {formatSos(row.dtSosLunchSec)} /{" "}
                  {formatSos(row.dtSosDinnerSec)}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-slate-500">
                  No daily rows for this month yet. Upload a CSV or PDF.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
