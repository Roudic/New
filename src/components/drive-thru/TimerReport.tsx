"use client";

import { useState } from "react";
import type { Session } from "@/lib/drive-thru/types";
import { BlockChart } from "./BlockChart";
import { buildSummaryText, exportSessionCsv } from "@/lib/drive-thru/export";
import {
  TARGET_GAP_SECONDS,
  TARGET_WINDOW_SECONDS,
  carCount,
  computeGapStats,
  computeWindowStats,
  departureTimes,
  formatDuration,
  formatTime,
  formatWindowTime,
  getBestWorstBlocks,
  getFifteenMinBlocks,
  overallCph,
  sosBand,
} from "@/lib/drive-thru/calculations";

interface TimerReportProps {
  session: Session;
  onBack: () => void;
}

export function TimerReport({ session, onBack }: TimerReportProps) {
  const [copied, setCopied] = useState(false);

  const endedAt = session.endedAt ?? Date.now();
  const duration = endedAt - session.startedAt;
  const cars = carCount(session);
  const cph = overallCph(cars, duration);
  const blocks = getFifteenMinBlocks(session, endedAt);
  const { best, worst } = getBestWorstBlocks(blocks);
  const gapStats = computeGapStats(departureTimes(session));
  const windowStats = computeWindowStats(session);
  const band = sosBand(windowStats.averageSec);

  const handleCopy = async () => {
    const text = buildSummaryText(session);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mx-auto min-h-dvh max-w-2xl px-4 py-6 pb-12">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 text-sm font-medium text-zinc-500 active:text-white"
      >
        ← Back
      </button>

      <header className="mb-6">
        <h1 className="text-2xl font-black text-white">Session Report</h1>
        <p className="mt-1 text-sm capitalize text-zinc-400">
          {session.daypart} · {session.laneConfig} lane
          {session.note && ` · ${session.note}`}
        </p>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <ReportStat label="Total cars" value={String(cars)} />
        <ReportStat
          label="Avg SOS"
          value={
            windowStats.averageSec != null
              ? formatWindowTime(windowStats.averageSec, "sec")
              : "—"
          }
          highlight
        />
        <ReportStat label="Overall CPH" value={String(Math.round(cph))} />
        <ReportStat label="Duration" value={formatDuration(duration)} />
        {best && <ReportStat label="Best 15-min" value={`${best.count} (${best.cph})`} />}
        {worst && <ReportStat label="Worst 15-min" value={`${worst.count} (${worst.cph})`} />}
      </div>

      <section className="mb-6 rounded-2xl bg-zinc-900 p-5">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Speed of service
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <MiniStat
            label="Average window"
            value={
              windowStats.averageSec != null
                ? formatWindowTime(windowStats.averageSec, "sec")
                : "—"
            }
            tone={band}
          />
          <MiniStat
            label="Median"
            value={
              windowStats.medianSec != null
                ? formatWindowTime(windowStats.medianSec, "sec")
                : "—"
            }
          />
          <MiniStat
            label="Fastest"
            value={
              windowStats.fastestSec != null
                ? formatWindowTime(windowStats.fastestSec, "sec")
                : "—"
            }
          />
          <MiniStat
            label="Slowest"
            value={
              windowStats.slowestSec != null
                ? formatWindowTime(windowStats.slowestSec, "sec")
                : "—"
            }
            sub={windowStats.slowestAt ? `at ${formatTime(windowStats.slowestAt)}` : undefined}
          />
          <MiniStat
            label={`Under ${TARGET_WINDOW_SECONDS}s goal`}
            value={`${windowStats.underTarget} / ${windowStats.timedCars}`}
          />
          <MiniStat label="Timed cars" value={String(windowStats.timedCars)} />
        </div>
      </section>

      <section className="mb-6 rounded-2xl bg-zinc-900 p-5">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Cars per 15-min block
        </h2>
        <BlockChart blocks={blocks} />
      </section>

      <section className="mb-6 rounded-2xl bg-zinc-900 p-5">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Gap analysis
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <MiniStat
            label="Average gap"
            value={gapStats.averageGap != null ? `${gapStats.averageGap.toFixed(1)}s` : "—"}
          />
          <MiniStat
            label="Longest gap"
            value={gapStats.longestGap != null ? `${gapStats.longestGap.toFixed(0)}s` : "—"}
            sub={gapStats.longestGapAt ? `at ${formatTime(gapStats.longestGapAt)}` : undefined}
          />
          <MiniStat label="Stall events (45s+)" value={String(gapStats.stallEvents)} />
          <MiniStat
            label={`Under ${TARGET_GAP_SECONDS}s target`}
            value={`${gapStats.gapsBeatingTarget} / ${gapStats.totalGaps}`}
          />
        </div>
      </section>

      {session.flags.length > 0 && (
        <section className="mb-6 rounded-2xl bg-zinc-900 p-5">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Flags ({session.flags.length})
          </h2>
          <div className="space-y-2">
            {session.flags.map((flag, i) => (
              <div
                key={`${flag.at}-${i}`}
                className="flex items-center justify-between rounded-lg bg-zinc-800/50 px-3 py-2"
              >
                <span className="text-sm text-white">{flag.reason}</span>
                <span className="text-xs tabular-nums text-zinc-500">{formatTime(flag.at)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => exportSessionCsv(session)}
          className="flex-1 rounded-xl bg-zinc-800 py-4 text-base font-bold text-white active:bg-zinc-700"
        >
          Export CSV
        </button>
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="flex-1 rounded-xl bg-cfa py-4 text-base font-bold text-white active:bg-cfa-dark"
        >
          {copied ? "Copied!" : "Copy Summary"}
        </button>
      </div>
    </div>
  );
}

function ReportStat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl bg-zinc-900 p-4">
      <p className={`text-2xl font-black tabular-nums ${highlight ? "text-cfa" : "text-white"}`}>
        {value}
      </p>
      <p className="text-xs text-zinc-500">{label}</p>
    </div>
  );
}

function MiniStat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "good" | "watch" | "hot" | "na";
}) {
  const color =
    tone === "good"
      ? "text-emerald-400"
      : tone === "watch"
        ? "text-amber-400"
        : tone === "hot"
          ? "text-rose-400"
          : "text-white";
  return (
    <div>
      <p className={`text-xl font-bold tabular-nums ${color}`}>{value}</p>
      <p className="text-xs text-zinc-500">{label}</p>
      {sub && <p className="text-[10px] text-zinc-600">{sub}</p>}
    </div>
  );
}
