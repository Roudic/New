"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useScorecard } from "@/hooks/useScorecard";
import { sosBand } from "@/lib/scorecard/calculations";
import { formatCount, formatMoney, formatSos } from "@/lib/scorecard/format";
import { daypartSubtotals } from "@/lib/scorecard/parse-interval";
import { DAYPART_LABEL, type Daypart } from "@/lib/scorecard/types";

const PART_TONE: Record<Daypart, string> = {
  breakfast: "bg-amber-50 text-amber-800",
  lunch: "bg-rose-50 text-rose-700",
  afternoon: "bg-sky-50 text-sky-800",
  dinner: "bg-violet-50 text-violet-800",
};

function SosCell({ seconds }: { seconds?: number }) {
  const band = sosBand(seconds);
  const cls = {
    good: "bg-emerald-50 text-emerald-700",
    watch: "bg-amber-50 text-amber-800",
    hot: "bg-rose-50 text-rose-700",
    na: "bg-slate-100 text-slate-500",
  }[band];
  return <span className={`rounded-lg px-2 py-1 text-sm font-semibold ${cls}`}>{formatSos(seconds)}</span>;
}

export default function IntervalScorecardPage() {
  const { state } = useScorecard();
  const dates = useMemo(
    () => Array.from(new Set(state.intervals.map((row) => row.date))).sort().reverse(),
    [state.intervals]
  );
  const [date, setDate] = useState(dates[0] ?? "2026-06-12");
  const rows = state.intervals.filter((row) => row.date === date).sort((a, b) => a.startMin - b.startMin);
  const day = rows[0];
  const parts = daypartSubtotals(rows);
  const daySales = rows.reduce((sum, row) => sum + (row.sales ?? 0), 0);
  const dayTrans = rows.reduce((sum, row) => sum + (row.trans ?? 0), 0);
  const scoredDay = state.days.find((row) => row.date === date && row.kind === "day");

  return (
    <>
      <PageHeader
        eyebrow="15-Minute"
        title="Quarter-hour board"
        description="Each 15-minute bucket is added up to the day's sales, transactions, and daypart SOS. Upload a 15-minute CSV or Excel from your phone to fill a new day."
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="text-sm font-semibold text-slate-600">
          Date
          <select
            className="field-input ml-2 w-auto"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          >
            {(dates.length ? dates : [date]).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <p className="text-sm text-slate-500">
          {day ? `${day.dayOfWeek} · ${rows.length} intervals` : "No 15-minute rows yet"}
        </p>
      </div>

      {rows.length > 0 && (
        <section className="mb-6 glass-panel border-t-4 border-t-cfa p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
            {day?.dayOfWeek} · {date} · day total from 15-minute rows
          </p>
          <div className="mt-3 flex flex-wrap gap-6">
            <div>
              <p className="text-sm text-slate-500">Sales</p>
              <p className="text-3xl font-bold text-slate-900">{formatMoney(daySales || scoredDay?.salesActual)}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Transactions</p>
              <p className="text-3xl font-bold text-slate-900">{formatCount(dayTrans || scoredDay?.transTy)}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Intervals</p>
              <p className="text-3xl font-bold text-slate-900">{rows.length}</p>
            </div>
          </div>
        </section>
      )}

      <section className="mb-6 grid gap-4 md:grid-cols-4">
        {parts.map((part) => (
          <article key={part.daypart} className="glass-panel p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
              {DAYPART_LABEL[part.daypart]}
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{formatSos(part.sosSec)}</p>
            <p className="mt-1 text-xs font-medium text-slate-500">
              {formatMoney(part.sales || null)} · {formatCount(part.trans || null)} trans
            </p>
          </article>
        ))}
      </section>

      <div className="glass-panel overflow-x-auto">
        <table className="min-w-[720px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-3">Time</th>
              <th className="px-3 py-3">Daypart</th>
              <th className="px-3 py-3">Sales</th>
              <th className="px-3 py-3">Trans</th>
              <th className="px-3 py-3">Cars</th>
              <th className="px-3 py-3">SOS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={`${row.date}-${row.startMin}`}>
                <td className="px-3 py-2.5 font-medium">{row.label}</td>
                <td className="px-3 py-2.5">
                  <span className={`rounded-lg px-2 py-1 text-xs font-semibold ${PART_TONE[row.daypart]}`}>
                    {DAYPART_LABEL[row.daypart]}
                  </span>
                </td>
                <td className="px-3 py-2.5">{formatMoney(row.sales)}</td>
                <td className="px-3 py-2.5">{formatCount(row.trans)}</td>
                <td className="px-3 py-2.5">{formatCount(row.cars)}</td>
                <td className="px-3 py-2.5">
                  <SosCell seconds={row.sosSec} />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                  Upload a 15-minute CSV or PDF to fill this board.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
