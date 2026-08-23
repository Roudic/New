"use client";

import { PageHeader } from "@/components/PageHeader";
import { useScorecard } from "@/hooks/useScorecard";
import { activeYearMonth, yoyRows } from "@/lib/scorecard/calculations";
import { formatKpi, formatSignedPercent } from "@/lib/scorecard/format";

export default function YoyScorecardPage() {
  const { state } = useScorecard();
  const { year } = activeYearMonth(state);
  const rows = yoyRows(state, year);

  return (
    <>
      <PageHeader
        eyebrow="Year over year"
        title={`${year} vs ${year - 1}`}
        description="Same-period comparison. 2025 is empty until last year's Daily Data is uploaded."
      />
      <div className="glass-panel overflow-x-auto">
        <table className="min-w-[640px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-3">Metric</th>
              <th className="px-3 py-3">{year - 1}</th>
              <th className="px-3 py-3">{year}</th>
              <th className="px-3 py-3">Change</th>
              <th className="px-3 py-3">% Chg</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.metric}>
                <td className="px-3 py-2.5 font-semibold">{row.metric}</td>
                <td className="px-3 py-2.5">{formatKpi(row.prior, row.unit)}</td>
                <td className="px-3 py-2.5">{formatKpi(row.current, row.unit)}</td>
                <td className="px-3 py-2.5">{formatKpi(row.change, row.unit)}</td>
                <td className="px-3 py-2.5">{formatSignedPercent(row.pct)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
