import { useState } from "react";
import type { Session } from "../types";
import { BarChart } from "../components/BarChart";
import {
  computeGapStats,
  formatDuration,
  formatTime,
  getBestWorstBlocks,
  getFifteenMinBlocks,
  overallCph,
  TARGET_GAP_SECONDS,
} from "../lib/calculations";
import { buildSummaryText, exportSessionCsv } from "../lib/export";

interface ReportScreenProps {
  session: Session;
  onBack: () => void;
}

export function ReportScreen({ session, onBack }: ReportScreenProps) {
  const [copied, setCopied] = useState(false);

  const endedAt = session.endedAt ?? Date.now();
  const duration = endedAt - session.startedAt;
  const cph = overallCph(session.departures.length, duration);
  const blocks = getFifteenMinBlocks(
    session.departures,
    session.startedAt,
    endedAt,
  );
  const { best, worst } = getBestWorstBlocks(blocks);
  const gapStats = computeGapStats(session.departures);

  const handleCopy = async () => {
    const text = buildSummaryText(session);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
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
        <ReportStat label="Total cars" value={String(session.departures.length)} />
        <ReportStat label="Duration" value={formatDuration(duration)} />
        <ReportStat label="Overall CPH" value={String(Math.round(cph))} highlight />
        {best && (
          <ReportStat
            label="Best 15-min"
            value={`${best.count} (${best.cph})`}
          />
        )}
        {worst && (
          <ReportStat
            label="Worst 15-min"
            value={`${worst.count} (${worst.cph})`}
          />
        )}
      </div>

      <section className="mb-6 rounded-2xl bg-surface p-5">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Cars per 15-min block
        </h2>
        <BarChart blocks={blocks} />
      </section>

      <section className="mb-6 rounded-2xl bg-surface p-5">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Gap analysis
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <MiniStat
            label="Average gap"
            value={
              gapStats.averageGap !== null
                ? `${gapStats.averageGap.toFixed(1)}s`
                : "—"
            }
          />
          <MiniStat
            label="Longest gap"
            value={
              gapStats.longestGap !== null
                ? `${gapStats.longestGap.toFixed(0)}s`
                : "—"
            }
            sub={
              gapStats.longestGapAt
                ? `at ${formatTime(gapStats.longestGapAt)}`
                : undefined
            }
          />
          <MiniStat
            label="Stall events (45s+)"
            value={String(gapStats.stallEvents)}
          />
          <MiniStat
            label={`Under ${TARGET_GAP_SECONDS}s target`}
            value={`${gapStats.gapsBeatingTarget} / ${gapStats.totalGaps}`}
          />
        </div>
      </section>

      {session.flags.length > 0 && (
        <section className="mb-6 rounded-2xl bg-surface p-5">
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
                <span className="text-xs tabular-nums text-zinc-500">
                  {formatTime(flag.at)}
                </span>
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
          onClick={handleCopy}
          className="flex-1 rounded-xl bg-cfa-red py-4 text-base font-bold text-white active:bg-cfa-red-dark"
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
    <div className="rounded-xl bg-surface p-4">
      <p
        className={`text-2xl font-black tabular-nums ${highlight ? "text-cfa-red" : "text-white"}`}
      >
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
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div>
      <p className="text-xl font-bold tabular-nums text-white">{value}</p>
      <p className="text-xs text-zinc-500">{label}</p>
      {sub && <p className="text-[10px] text-zinc-600">{sub}</p>}
    </div>
  );
}
