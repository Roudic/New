import type { Session } from "../types";
import {
  computeGapStats,
  formatBlockRange,
  formatDaypartLabel,
  formatDuration,
  getBestWorstBlocks,
  getFifteenMinBlocks,
  overallCph,
} from "./calculations";

export function exportSessionCsv(session: Session): void {
  const date = new Date(session.startedAt);
  const dateStr = date.toISOString().slice(0, 10);
  const filename = `pulse_${dateStr}_${session.daypart}.csv`;

  const lines: string[] = [];

  lines.push("=== DEPARTURES ===");
  lines.push("timestamp,time,gap_seconds");
  session.departures.forEach((ts, i) => {
    const gap =
      i === 0 ? "" : ((ts - session.departures[i - 1]) / 1000).toFixed(1);
    const time = new Date(ts).toLocaleTimeString([], { hour12: false });
    lines.push(`${ts},${time},${gap}`);
  });

  lines.push("");
  lines.push("=== FLAGS ===");
  lines.push("timestamp,time,reason");
  session.flags.forEach((flag) => {
    const time = new Date(flag.at).toLocaleTimeString([], { hour12: false });
    lines.push(`${flag.at},${time},"${flag.reason.replace(/"/g, '""')}"`);
  });

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function buildSummaryText(session: Session): string {
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

  const flagCounts = new Map<string, number>();
  session.flags.forEach((f) => {
    flagCounts.set(f.reason, (flagCounts.get(f.reason) ?? 0) + 1);
  });
  let topFlag = "None";
  let topCount = 0;
  flagCounts.forEach((count, reason) => {
    if (count > topCount) {
      topCount = count;
      topFlag = reason;
    }
  });

  const dayLabel = formatDateShort(session.startedAt);
  const daypart = formatDaypartLabel(session.daypart);

  const lines = [
    `🚗 Drive-Thru Pulse — ${daypart} ${dayLabel}`,
    `Cars: ${session.departures.length} | Duration: ${formatDuration(duration)} | CPH: ${Math.round(cph)}`,
  ];

  if (best) {
    lines.push(
      `Best block: ${formatBlockRange(best.startMs, best.endMs)} (${best.count} cars / ${best.cph} pace)`,
    );
  }
  if (worst) {
    lines.push(
      `Worst block: ${formatBlockRange(worst.startMs, worst.endMs)} (${worst.count} cars / ${worst.cph} pace)`,
    );
  }

  lines.push(`Stall events (45s+ gaps): ${gapStats.stallEvents}`);
  lines.push(`Top flag: ${topFlag}${topCount > 0 ? ` (${topCount})` : ""}`);

  return lines.join("\n");
}

function formatDateShort(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
