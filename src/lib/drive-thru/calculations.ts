import type { Car, Session } from "./types";
import {
  TARGET_CPH,
  TARGET_GAP_SECONDS,
  TARGET_WINDOW_SECONDS,
  WINDOW_HOT_SECONDS,
  WINDOW_WATCH_SECONDS,
  STALL_THRESHOLD_SECONDS,
} from "./types";

export const BLOCK_MS = 15 * 60 * 1000;
export const TEN_MINUTES_MS = 10 * 60 * 1000;

export interface FifteenMinBlock {
  startMs: number;
  endMs: number;
  count: number;
  cph: number;
  avgWindowSec: number | null;
}

export interface GapStats {
  averageGap: number | null;
  longestGap: number | null;
  longestGapAt: number | null;
  stallEvents: number;
  gapsBeatingTarget: number;
  totalGaps: number;
}

export interface WindowStats {
  averageSec: number | null;
  medianSec: number | null;
  fastestSec: number | null;
  slowestSec: number | null;
  slowestAt: number | null;
  underTarget: number;
  timedCars: number;
  totalCars: number;
}

export function departedCars(session: Session): Array<Car & { departedAt: number }> {
  return session.cars.filter((c): c is Car & { departedAt: number } => c.departedAt != null);
}

export function currentCar(session: Session): Car | null {
  return session.cars.find((c) => c.departedAt == null) ?? null;
}

export function departureTimes(session: Session): number[] {
  return departedCars(session)
    .map((c) => c.departedAt)
    .sort((a, b) => a - b);
}

export function carCount(session: Session): number {
  return departedCars(session).length;
}

export function windowSeconds(car: Car): number | null {
  if (car.arrivedAt == null || car.departedAt == null) return null;
  const sec = (car.departedAt - car.arrivedAt) / 1000;
  return sec >= 0 ? sec : null;
}

export function computeGaps(departures: number[]): number[] {
  const gaps: number[] = [];
  for (let i = 1; i < departures.length; i++) {
    gaps.push((departures[i] - departures[i - 1]) / 1000);
  }
  return gaps;
}

export function rollingCph(departures: number[], now: number, sessionStart: number): number {
  const elapsedMs = now - sessionStart;
  if (departures.length === 0) return 0;

  if (elapsedMs < TEN_MINUTES_MS) {
    const elapsedMinutes = elapsedMs / 60000;
    if (elapsedMinutes <= 0) return 0;
    return (departures.length / elapsedMinutes) * 60;
  }

  const cutoff = now - TEN_MINUTES_MS;
  const recent = departures.filter((d) => d >= cutoff).length;
  return recent * 6;
}

export function overallCph(totalCars: number, durationMs: number): number {
  if (durationMs <= 0 || totalCars === 0) return 0;
  return totalCars / (durationMs / 3600000);
}

export function avgGapLastN(departures: number[], n = 10): number | null {
  if (departures.length < 2) return null;
  const start = Math.max(1, departures.length - n);
  let total = 0;
  let count = 0;
  for (let i = start; i < departures.length; i++) {
    total += (departures[i] - departures[i - 1]) / 1000;
    count++;
  }
  return count > 0 ? total / count : null;
}

export function computeWindowStats(session: Session): WindowStats {
  const timed: Array<{ sec: number; at: number }> = [];
  for (const car of departedCars(session)) {
    const sec = windowSeconds(car);
    if (sec == null) continue;
    timed.push({ sec, at: car.departedAt });
  }

  const totalCars = carCount(session);
  if (timed.length === 0) {
    return {
      averageSec: null,
      medianSec: null,
      fastestSec: null,
      slowestSec: null,
      slowestAt: null,
      underTarget: 0,
      timedCars: 0,
      totalCars,
    };
  }

  const secs = timed.map((t) => t.sec).sort((a, b) => a - b);
  const total = secs.reduce((sum, n) => sum + n, 0);
  const mid = Math.floor(secs.length / 2);
  const median =
    secs.length % 2 === 0 ? (secs[mid - 1] + secs[mid]) / 2 : secs[mid];
  const slowest = timed.reduce((best, t) => (t.sec > best.sec ? t : best));

  return {
    averageSec: total / secs.length,
    medianSec: median,
    fastestSec: secs[0],
    slowestSec: secs[secs.length - 1],
    slowestAt: slowest.at,
    underTarget: secs.filter((s) => s <= TARGET_WINDOW_SECONDS).length,
    timedCars: secs.length,
    totalCars,
  };
}

export function getBlockStartMs(timestamp: number): number {
  const d = new Date(timestamp);
  const minutes = d.getMinutes();
  const blockMinute = Math.floor(minutes / 15) * 15;
  d.setMinutes(blockMinute, 0, 0);
  return d.getTime();
}

export function getFifteenMinBlocks(
  session: Session,
  sessionEnd: number
): FifteenMinBlock[] {
  const departures = departureTimes(session);
  if (departures.length === 0) return [];

  const firstBlockStart = getBlockStartMs(session.startedAt);
  const lastBlockStart = getBlockStartMs(sessionEnd);
  const blocks: FifteenMinBlock[] = [];

  for (let start = firstBlockStart; start <= lastBlockStart; start += BLOCK_MS) {
    const end = start + BLOCK_MS;
    const inBlock = departedCars(session).filter(
      (c) => c.departedAt >= start && c.departedAt < end
    );
    const windowSecs = inBlock
      .map((c) => windowSeconds(c))
      .filter((n): n is number => n != null);
    blocks.push({
      startMs: start,
      endMs: end,
      count: inBlock.length,
      cph: inBlock.length * 4,
      avgWindowSec:
        windowSecs.length > 0
          ? windowSecs.reduce((s, n) => s + n, 0) / windowSecs.length
          : null,
    });
  }

  return blocks;
}

export function getBestWorstBlocks(blocks: FifteenMinBlock[]): {
  best: FifteenMinBlock | null;
  worst: FifteenMinBlock | null;
} {
  if (blocks.length === 0) return { best: null, worst: null };

  let best = blocks[0];
  let worst = blocks[0];

  for (const block of blocks) {
    if (block.count > best.count) best = block;
    if (block.count < worst.count) worst = block;
  }

  return { best, worst };
}

export function computeGapStats(departures: number[]): GapStats {
  const gaps = computeGaps(departures);

  if (gaps.length === 0) {
    return {
      averageGap: null,
      longestGap: null,
      longestGapAt: null,
      stallEvents: 0,
      gapsBeatingTarget: 0,
      totalGaps: 0,
    };
  }

  let longestGap = gaps[0];
  let longestGapIndex = 0;
  let stallEvents = 0;
  let gapsBeatingTarget = 0;
  let total = 0;

  gaps.forEach((gap, i) => {
    total += gap;
    if (gap > longestGap) {
      longestGap = gap;
      longestGapIndex = i;
    }
    if (gap >= STALL_THRESHOLD_SECONDS) stallEvents++;
    if (gap <= TARGET_GAP_SECONDS) gapsBeatingTarget++;
  });

  return {
    averageGap: total / gaps.length,
    longestGap,
    longestGapAt: departures[longestGapIndex + 1] ?? null,
    stallEvents,
    gapsBeatingTarget,
    totalGaps: gaps.length,
  };
}

export function paceColor(cph: number): "green" | "yellow" | "red" {
  if (cph >= TARGET_CPH) return "green";
  if (cph >= 150) return "yellow";
  return "red";
}

export function blockBarColor(count: number): "green" | "yellow" | "red" {
  if (count >= 40) return "green";
  if (count >= 38) return "yellow";
  return "red";
}

export function sosBand(seconds: number | null | undefined): "good" | "watch" | "hot" | "na" {
  if (seconds == null) return "na";
  if (seconds <= TARGET_WINDOW_SECONDS) return "good";
  if (seconds <= WINDOW_WATCH_SECONDS) return "watch";
  if (seconds <= WINDOW_HOT_SECONDS) return "watch";
  return "hot";
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(Math.max(0, ms) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

export function formatWindowTime(msOrSec: number, unit: "ms" | "sec" = "ms"): string {
  const totalSeconds = Math.floor(unit === "ms" ? Math.max(0, msOrSec) / 1000 : Math.max(0, msOrSec));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatBlockRange(startMs: number, endMs: number): string {
  return `${formatTime(startMs)}–${formatTime(endMs)}`;
}

export function formatDaypartLabel(daypart: string): string {
  return daypart.charAt(0).toUpperCase() + daypart.slice(1);
}

export function formatDateShort(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export { TARGET_CPH, TARGET_GAP_SECONDS, TARGET_WINDOW_SECONDS, STALL_THRESHOLD_SECONDS };
