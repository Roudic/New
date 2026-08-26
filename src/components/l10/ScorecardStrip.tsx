"use client";

import Link from "next/link";
import { KpiTile } from "@/components/scorecard/KpiTile";
import { useScorecard } from "@/hooks/useScorecard";
import {
  activeYearMonth,
  latestDataDate,
  monthKpis,
  rollupMonth,
} from "@/lib/scorecard/calculations";
import { formatSos, prettyDate } from "@/lib/scorecard/format";
import { monthLabel } from "@/lib/scorecard/values";

export function ScorecardStrip({ compact = false }: { compact?: boolean }) {
  const { state, loading } = useScorecard();
  const { year, month } = activeYearMonth(state);
  const kpis = monthKpis(state, year, month);
  const mtd = rollupMonth(state, year, month);
  const through = latestDataDate(state);

  if (loading) {
    return <p className="text-sm text-slate-500">Loading scorecard…</p>;
  }

  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
            {monthLabel(month)} {year} numbers
          </p>
          <p className="text-xs text-slate-500">
            {through ? `Through ${prettyDate(through)}` : "Upload a scorecard to fill this strip."}
            {mtd.dtSosAvgSec != null ? ` · DT SOS ${formatSos(mtd.dtSosAvgSec)}` : ""}
          </p>
        </div>
        <Link href="/scorecard" className="text-xs font-semibold text-cfa hover:text-cfa-dark">
          Open scorecard →
        </Link>
      </div>
      <div className={`grid gap-3 ${compact ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
        {kpis.map((kpi) => (
          <KpiTile key={kpi.key} kpi={kpi} />
        ))}
      </div>
    </section>
  );
}
