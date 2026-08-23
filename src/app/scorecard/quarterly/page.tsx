"use client";

import { PageHeader } from "@/components/PageHeader";
import { useScorecard } from "@/hooks/useScorecard";
import { activeYearMonth, quarterlyRollups } from "@/lib/scorecard/calculations";
import { formatCount, formatMoney, formatPercent, formatScore } from "@/lib/scorecard/format";

export default function QuarterlyScorecardPage() {
  const { state } = useScorecard();
  const { year } = activeYearMonth(state);
  const rows = quarterlyRollups(state, year);

  return (
    <>
      <PageHeader
        eyebrow="Quarterly Summary"
        title={`${year} by quarter`}
        description="Auto-rolled from Daily Data and monthly P&L overlays. No extra entry needed."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {rows.map((row) => (
          <article key={row.quarter} className="glass-panel p-5">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-cfa">{row.label}</p>
            <p className="mt-3 text-3xl font-bold text-slate-900">{formatMoney(row.salesActual || null)}</p>
            <p className="mt-1 text-sm text-slate-500">Goal {formatMoney(row.salesGoal || null)}</p>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-slate-500">Labor %</dt>
                <dd className="font-semibold">{formatPercent(row.laborPct)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">OSAT</dt>
                <dd className="font-semibold">{formatScore(row.osat)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Food cost</dt>
                <dd className="font-semibold">{formatPercent(row.foodCostPct)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Net profit</dt>
                <dd className="font-semibold">{formatPercent(row.netProfitPct)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Transactions</dt>
                <dd className="font-semibold">{formatCount(row.transTy || null)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Operating days</dt>
                <dd className="font-semibold">{row.operatingDays || "—"}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </>
  );
}
