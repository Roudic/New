"use client";

import { PageHeader } from "@/components/PageHeader";
import { StatusChip } from "@/components/scorecard/ScorecardChrome";
import { useScorecard } from "@/hooks/useScorecard";
import { activeYearMonth, goalsForYear, rollupMonth } from "@/lib/scorecard/calculations";
import { formatMoney, formatPercent, formatScore, formatSos } from "@/lib/scorecard/format";

export default function MonthlyScorecardPage() {
  const { state } = useScorecard();
  const { year } = activeYearMonth(state);
  const goals = goalsForYear(state, year);
  const rows = Array.from({ length: 12 }, (_, i) => rollupMonth(state, year, i + 1));
  const maxSales = Math.max(...rows.map((r) => r.salesActual), 1);

  return (
    <>
      <PageHeader
        eyebrow="Monthly Summary"
        title={`${year} performance`}
        description="Rolled up from Daily Data. Food cost and net profit stay blank until the monthly P&L overlay is uploaded."
      />

      <div className="mb-6 glass-panel p-5">
        <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
          Sales vs goal
        </p>
        <div className="grid grid-cols-12 items-end gap-2">
          {rows.map((row) => (
            <div key={row.month} className="flex flex-col items-center gap-1">
              <div className="flex h-32 w-full items-end gap-0.5">
                <div
                  className="w-1/2 rounded-t bg-slate-200"
                  style={{ height: `${(row.salesGoal / maxSales) * 100}%` }}
                  title={`Goal ${formatMoney(row.salesGoal)}`}
                />
                <div
                  className="w-1/2 rounded-t bg-cfa"
                  style={{ height: `${(row.salesActual / maxSales) * 100}%` }}
                  title={`Actual ${formatMoney(row.salesActual)}`}
                />
              </div>
              <span className="text-[10px] font-semibold text-slate-500">{row.label.slice(0, 3)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-panel overflow-x-auto">
        <table className="min-w-[900px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-3">Month</th>
              <th className="px-3 py-3">Sales</th>
              <th className="px-3 py-3">Goal</th>
              <th className="px-3 py-3">Labor %</th>
              <th className="px-3 py-3">OSAT</th>
              <th className="px-3 py-3">Food cost</th>
              <th className="px-3 py-3">Net profit</th>
              <th className="px-3 py-3">SOS</th>
              <th className="px-3 py-3">Days</th>
              <th className="px-3 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => {
              const laborOk = row.laborPct == null || row.laborPct <= goals.laborTargetPct;
              const salesOk = !row.salesGoal || row.salesActual >= row.salesGoal;
              return (
                <tr key={row.month} className={row.salesActual ? "" : "text-slate-400"}>
                  <td className="px-3 py-2.5 font-semibold text-slate-900">{row.label}</td>
                  <td className="px-3 py-2.5">{formatMoney(row.salesActual || null)}</td>
                  <td className="px-3 py-2.5">{formatMoney(row.salesGoal || null)}</td>
                  <td className={`px-3 py-2.5 ${laborOk ? "" : "text-rose-600"}`}>
                    {formatPercent(row.laborPct)}
                  </td>
                  <td className="px-3 py-2.5">{formatScore(row.osat)}</td>
                  <td className="px-3 py-2.5">{formatPercent(row.foodCostPct)}</td>
                  <td className="px-3 py-2.5">{formatPercent(row.netProfitPct)}</td>
                  <td className="px-3 py-2.5">{formatSos(row.dtSosAvgSec)}</td>
                  <td className="px-3 py-2.5">{row.operatingDays || "—"}</td>
                  <td className="px-3 py-2.5">
                    <StatusChip
                      status={
                        !row.salesActual ? "na" : salesOk && laborOk ? "on_track" : "behind"
                      }
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
