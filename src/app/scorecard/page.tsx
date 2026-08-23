"use client";

import Link from "next/link";
import {
  CalendarDays,
  CalendarRange,
  Goal,
  Layers,
  LineChart,
  Timer,
  Upload,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { KpiTile } from "@/components/scorecard/KpiTile";
import { useScorecard } from "@/hooks/useScorecard";
import {
  activeYearMonth,
  latestDataDate,
  monthKpis,
  rollupMonth,
  rollupRange,
} from "@/lib/scorecard/calculations";
import { formatMoney, formatPercent, formatScore, prettyDate } from "@/lib/scorecard/format";
import { monthLabel } from "@/lib/scorecard/values";

const BRANCHES = [
  {
    href: "/scorecard/daily",
    title: "Daily Data",
    copy: "Sales, labor, OSAT, and SOS for every operating day.",
    icon: CalendarDays,
  },
  {
    href: "/scorecard/drive-thru",
    title: "Drive-Thru SOS",
    copy: "Breakfast, lunch, and dinner speed versus the 5:00 goal.",
    icon: Timer,
  },
  {
    href: "/scorecard/monthly",
    title: "Monthly",
    copy: "12-month trend for sales, labor, food cost, and OSAT.",
    icon: CalendarRange,
  },
  {
    href: "/scorecard/quarterly",
    title: "Quarterly",
    copy: "Q1–Q4 rollups from the same daily source of truth.",
    icon: Layers,
  },
  {
    href: "/scorecard/yoy",
    title: "Year over Year",
    copy: "2026 versus the same period in 2025.",
    icon: LineChart,
  },
  {
    href: "/scorecard/goals",
    title: "Goals",
    copy: "Labor, OSAT, food cost, profit, and SOS targets.",
    icon: Goal,
  },
];

export default function ScorecardHubPage() {
  const { state, loading } = useScorecard();
  const { year, month } = activeYearMonth(state);
  const kpis = monthKpis(state, year, month);
  const mtd = rollupMonth(state, year, month);
  const ytd = rollupRange(state, year, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  const through = latestDataDate(state);

  return (
    <>
      <PageHeader
        eyebrow="Chick-fil-A Hueytown"
        title="Scorecard Hub"
        description={
          through
            ? `${monthLabel(month)} ${year} month-to-date · data through ${prettyDate(through)}.`
            : "Upload a Daily Data CSV or the Hueytown workbook PDF to populate this hub."
        }
        action={
          <Link href="/scorecard/upload" className="btn-primary bg-cfa hover:bg-cfa-dark">
            <Upload className="h-4 w-4" />
            Upload CSV / PDF
          </Link>
        }
      />

      {loading ? (
        <p className="text-sm text-slate-500">Loading Hueytown numbers…</p>
      ) : (
        <>
          <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {kpis.map((kpi) => (
              <KpiTile key={kpi.key} kpi={kpi} />
            ))}
          </section>

          <section className="mb-8 grid gap-4 lg:grid-cols-3">
            <article className="glass-panel p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                MTD snapshot
              </p>
              <dl className="mt-3 space-y-2 text-sm">
                <Row label="Sales" value={formatMoney(mtd.salesActual)} />
                <Row label="Sales goal" value={formatMoney(mtd.salesGoal)} />
                <Row label="Labor" value={formatPercent(mtd.laborPct)} />
                <Row label="OSAT" value={formatScore(mtd.osat)} />
                <Row label="Transactions" value={mtd.transTy.toLocaleString()} />
              </dl>
            </article>
            <article className="glass-panel p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                YTD snapshot
              </p>
              <dl className="mt-3 space-y-2 text-sm">
                <Row label="Sales" value={formatMoney(ytd.salesActual)} />
                <Row label="Sales goal" value={formatMoney(ytd.salesGoal)} />
                <Row label="Labor" value={formatPercent(ytd.laborPct)} />
                <Row label="Food cost" value={formatPercent(ytd.foodCostPct)} />
                <Row label="Net profit" value={formatPercent(ytd.netProfitPct)} />
              </dl>
            </article>
            <article className="glass-panel bg-cfa p-5 text-white">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/70">
                How this updates
              </p>
              <p className="mt-3 text-sm leading-relaxed text-white/90">
                Daily rows drive every tile. Food cost and net profit come from the monthly P&amp;L
                overlay. Upload the workbook PDF or a Daily Data CSV to refresh.
              </p>
              <Link
                href="/scorecard/upload"
                className="mt-4 inline-flex text-sm font-semibold text-white underline"
              >
                Import the latest file
              </Link>
            </article>
          </section>

          <h2 className="section-title mb-4">Branch pages</h2>
          <section className="grid gap-4 md:grid-cols-2">
            {BRANCHES.map(({ href, title, copy, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="glass-panel flex items-start gap-4 p-5 transition-shadow hover:shadow-card-hover"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-cfa">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-slate-900">{title}</p>
                  <p className="mt-1 text-sm text-slate-600">{copy}</p>
                </div>
              </Link>
            ))}
          </section>
        </>
      )}
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-semibold text-slate-900">{value}</dd>
    </div>
  );
}
