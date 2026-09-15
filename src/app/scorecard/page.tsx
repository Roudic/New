"use client";

import Link from "next/link";
import { Upload } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { KpiTile } from "@/components/scorecard/KpiTile";
import { useScorecard } from "@/hooks/useScorecard";
import { activeYearMonth, latestDataDate, monthKpis, rollupRange } from "@/lib/scorecard/calculations";
import { formatMoney, formatPercent, prettyDate } from "@/lib/scorecard/format";
import { monthLabel } from "@/lib/scorecard/values";

const HUB_KEYS = new Set(["sales", "labor", "osat", "trans"]);

export default function ScorecardHubPage() {
  const { state, loading } = useScorecard();
  const { year, month } = activeYearMonth(state);
  const kpis = monthKpis(state, year, month).filter((kpi) => HUB_KEYS.has(kpi.key));
  const ytd = rollupRange(state, year, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  const through = latestDataDate(state);

  return (
    <>
      <PageHeader
        eyebrow="Chick-fil-A Hueytown"
        title="Scorecard"
        description={
          through
            ? `${monthLabel(month)} ${year} · through ${prettyDate(through)}`
            : "Upload a Daily Data file or CEMS PDF to fill this page."
        }
        action={
          <Link href="/scorecard/upload" className="btn-primary bg-cfa hover:bg-cfa-dark">
            <Upload className="h-4 w-4" />
            Upload
          </Link>
        }
      />

      {loading ? (
        <p className="text-sm text-slate-500">Loading numbers…</p>
      ) : (
        <>
          <section className="mb-6 grid gap-3 sm:grid-cols-2">
            {kpis.map((kpi) => (
              <KpiTile key={kpi.key} kpi={kpi} />
            ))}
          </section>

          <p className="text-sm text-slate-500">
            YTD sales {formatMoney(ytd.salesActual)}
            {ytd.laborPct != null ? ` · labor ${formatPercent(ytd.laborPct)}` : ""}
            {ytd.foodCostPct != null ? ` · food ${formatPercent(ytd.foodCostPct)}` : ""}
            . Daily, 15-Minute, CEMS, and the rest are in the tabs above.
          </p>
        </>
      )}
    </>
  );
}
