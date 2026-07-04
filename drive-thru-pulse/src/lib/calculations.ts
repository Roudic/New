export const BLOCK_MS = 15 * 60 * 1000;
export const TEN_MINUTES_MS = 10 * 60 * 1000;
export const TARGET_GAP_SECONDS = 22.5;
export const STALL_THRESHOLD_SECONDS = 45;
export const TARGET_CPH = 160;

export interface FifteenMinBlock {
  startMs: number;
  endMs: number;
  count: number;
  cph: number;
}

export interface GapStats {
  averageGap: number | null;
  longestGap: number | null;
  longestGapAt: number | null;
  stallEvents: number;
  gapsBeatingTarget: number;
  totalGaps: number;
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
  const hours = durationMs / 3600000;
  return totalCars / hours;
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

export function getBlockStartMs(timestamp: number): number {
  const d = new Date(timestamp);
  const minutes = d.getMinutes();
  const blockMinute = Math.floor(minutes / 15) * 15;
  d.setMinutes(blockMinute, 0, 0);
  return d.getTime();
}

export function getFifteenMinBlocks(
  departures: number[],
  sessionStart: number,
  sessionEnd: number,
): FifteenMinBlock[] {
  if (departures.length === 0) return [];

  const firstBlockStart = getBlockStartMs(sessionStart);
  const lastBlockStart = getBlockStartMs(sessionEnd);
  const blocks: FifteenMinBlock[] = [];

  for (let start = firstBlockStart; start <= lastBlockStart; start += BLOCK_MS) {
    const end = start + BLOCK_MS;
    const count = departures.filter((d) => d >= start && d < end).length;
    blocks.push({
      startMs: start,
      endMs: end,
      count,
      cph: count * 4,
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

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
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

export function formatCph(value: number): string {
  return Math.round(value).toString();
}
