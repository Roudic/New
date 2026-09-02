import type { Session } from "./types";
import {
  carCount,
  computeGapStats,
  computeWindowStats,
  departureTimes,
  formatBlockRange,
  formatDateShort,
  formatDaypartLabel,
  formatDuration,
  formatWindowTime,
  getBestWorstBlocks,
  getFifteenMinBlocks,
  overallCph,
  windowSeconds,
} from "./calculations";

export function exportSessionCsv(session: Session): void {
  const date = new Date(session.startedAt);
  const dateStr = date.toISOString().slice(0, 10);
  const filename = `window_${dateStr}_${session.daypart}.csv`;

  const lines: string[] = [];
  lines.push("=== CARS ===");
  lines.push("car,arrived,departed,window_seconds,gap_seconds");

  const departed = session.cars.filter((c) => c.departedAt != null);
  departed.forEach((car, i) => {
    const arrived = car.arrivedAt
      ? new Date(car.arrivedAt).toLocaleTimeString([], { hour12: false })
      : "";
    const departedAt = new Date(car.departedAt!).toLocaleTimeString([], { hour12: false });
    const windowSec = windowSeconds(car);
    const prev = departed[i - 1];
    const gap =
      prev?.departedAt != null
        ? ((car.departedAt! - prev.departedAt) / 1000).toFixed(1)
        : "";
    lines.push(
      `${i + 1},${arrived},${departedAt},${windowSec != null ? windowSec.toFixed(1) : ""},${gap}`
    );
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
  const cars = carCount(session);
  const cph = overallCph(cars, duration);
  const windowStats = computeWindowStats(session);
  const blocks = getFifteenMinBlocks(session, endedAt);
  const { best, worst } = getBestWorstBlocks(blocks);
  const gapStats = computeGapStats(departureTimes(session));

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
  const avgSos =
    windowStats.averageSec != null ? formatWindowTime(windowStats.averageSec, "sec") : "—";

  const lines = [
    `🚗 Drive-Thru Window — ${daypart} ${dayLabel}`,
    `Cars: ${cars} | Avg SOS: ${avgSos} | Duration: ${formatDuration(duration)} | CPH: ${Math.round(cph)}`,
  ];

  if (windowStats.timedCars > 0) {
    lines.push(
      `Window: ${windowStats.underTarget}/${windowStats.timedCars} under 25s · slowest ${formatWindowTime(windowStats.slowestSec ?? 0, "sec")}`
    );
  }

  if (best) {
    lines.push(
      `Best block: ${formatBlockRange(best.startMs, best.endMs)} (${best.count} cars / ${best.cph} pace)`
    );
  }
  if (worst) {
    lines.push(
      `Worst block: ${formatBlockRange(worst.startMs, worst.endMs)} (${worst.count} cars / ${worst.cph} pace)`
    );
  }

  lines.push(`Stall events (45s+ gaps): ${gapStats.stallEvents}`);
  lines.push(`Top flag: ${topFlag}${topCount > 0 ? ` (${topCount})` : ""}`);

  return lines.join("\n");
}
