import type {
  DailyRow,
  MonthlyManual,
  ParseResult,
  ScorecardGoals,
  ScorecardKind,
  ScorecardState,
} from "./types";
import { emptyScorecard } from "./types";

const FILL_FROM_INTERVAL_SOS: Array<keyof DailyRow> = [
  "transTy",
  "transLy",
  "dtSosTotalSec",
  "dtSosBreakfastSec",
  "dtSosLunchSec",
  "dtSosAfternoonSec",
  "dtSosDinnerSec",
  "actualHours",
];

const OSAT_KEYS: Array<keyof DailyRow> = [
  "osat",
  "osatAccuracy",
  "osatClean",
  "osatTaste",
  "osatTemp",
  "osatFast",
  "osatCourteous",
  "osatPortion",
];

function sortDays(days: DailyRow[]): DailyRow[] {
  return [...days].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if (a.kind === b.kind) return 0;
    return a.kind === "day" ? -1 : 1;
  });
}

function sortIntervals<T extends { date: string; startMin: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.date.localeCompare(b.date) || a.startMin - b.startMin);
}

export function compact<T extends object>(row: T): Partial<T> {
  const next: Partial<T> = {};
  for (const [key, value] of Object.entries(row) as Array<[keyof T, T[keyof T]]>) {
    if (value !== undefined && value !== null && value !== "") {
      next[key] = value;
    }
  }
  return next;
}

function fillMissing(prev: DailyRow, incoming: DailyRow, keys: Array<keyof DailyRow>): DailyRow {
  const next = { ...prev };
  for (const key of keys) {
    if (next[key] == null && incoming[key] != null) {
      (next as unknown as Record<string, unknown>)[key as string] = incoming[key];
    }
  }
  if (!next.dayOfWeek && incoming.dayOfWeek) next.dayOfWeek = incoming.dayOfWeek;
  return next;
}

export function mergeDayRow(prev: DailyRow | undefined, incoming: DailyRow): DailyRow {
  if (!prev) return incoming;
  if (incoming.origin === "interval") {
    const filled = fillMissing(prev, incoming, FILL_FROM_INTERVAL_SOS);
    if (incoming.salesActual != null) filled.salesActual = incoming.salesActual;
    if (incoming.transTy != null) filled.transTy = incoming.transTy;
    if (filled.laborActual == null && incoming.laborActual != null) {
      filled.laborActual = incoming.laborActual;
    }
    return filled;
  }
  if (incoming.origin === "sos") {
    return fillMissing(prev, incoming, FILL_FROM_INTERVAL_SOS);
  }
  if (incoming.origin === "cems") {
    const next = { ...prev };
    for (const key of OSAT_KEYS) {
      if (incoming[key] != null) (next as unknown as Record<string, unknown>)[key as string] = incoming[key];
    }
    return next;
  }
  return { ...prev, ...compact(incoming) };
}

export function inferKinds(parsed: ParseResult): ScorecardKind[] {
  const kinds = new Set<ScorecardKind>(parsed.kinds ?? []);
  if (parsed.days.some((d) => d.origin === "cems" || d.osat != null)) {
    if (parsed.days.some((d) => d.origin === "cems")) kinds.add("cems");
  }
  if (parsed.days.some((d) => !d.origin || d.origin === "daily") && parsed.days.some((d) => d.salesActual != null || d.laborActual != null)) {
    kinds.add("daily");
  }
  if (parsed.days.some((d) => d.origin === "sos" || d.dtSosTotalSec != null)) {
    if (parsed.days.some((d) => d.origin === "sos")) kinds.add("sos");
  }
  if (parsed.intervals.length) kinds.add("interval");
  if (parsed.monthly.length) kinds.add("monthly");
  if (parsed.goals.length) kinds.add("goals");
  return Array.from(kinds);
}

export function combineParseResults(source: "csv" | "pdf", parts: ParseResult[]): ParseResult {
  const days = new Map<string, DailyRow>();
  const monthly = new Map<string, MonthlyManual>();
  const goals = new Map<number, ScorecardGoals>();
  const intervals = new Map<string, ParseResult["intervals"][number]>();
  const warnings: ParseResult["warnings"] = [];
  const kinds = new Set<ScorecardKind>();
  let location: string | undefined;

  for (const part of parts) {
    if (part.location) location = part.location;
    warnings.push(...part.warnings);
    for (const kind of part.kinds ?? []) kinds.add(kind);
    for (const row of part.days) {
      const key = `${row.date}:${row.kind}`;
      days.set(key, mergeDayRow(days.get(key), row));
    }
    for (const row of part.monthly) {
      const key = `${row.year}-${row.month}`;
      monthly.set(key, { ...monthly.get(key), ...row });
    }
    for (const row of part.goals) {
      goals.set(row.year, { ...goals.get(row.year), ...row });
    }
    for (const row of part.intervals) {
      const key = `${row.date}:${row.startMin}`;
      const prev = intervals.get(key);
      intervals.set(key, prev ? { ...prev, ...compact(row) } : row);
    }
  }

  const result: ParseResult = {
    location,
    days: sortDays(Array.from(days.values())),
    monthly: Array.from(monthly.values()).sort((a, b) => a.year - b.year || a.month - b.month),
    goals: Array.from(goals.values()).sort((a, b) => a.year - b.year),
    intervals: sortIntervals(Array.from(intervals.values())),
    warnings: warnings.filter((warning, index, all) => all.findIndex((w) => w.message === warning.message) === index),
    kinds: Array.from(kinds),
    source,
  };
  result.kinds = inferKinds(result);
  return result;
}

export function mergeParseResult(
  current: ScorecardState | null | undefined,
  parsed: ParseResult,
  mode: "merge" | "replace" = "merge",
  meta?: ScorecardState["lastImport"]
): ScorecardState {
  const base = mode === "replace" || !current ? emptyScorecard() : structuredClone(current);
  if (!Array.isArray(base.intervals)) base.intervals = [];

  if (parsed.location) base.location = parsed.location;

  if (mode === "replace") {
    if (parsed.days.length) base.days = parsed.days;
    if (parsed.monthly.length) base.monthly = parsed.monthly;
    if (parsed.goals.length) base.goals = parsed.goals;
    if (parsed.intervals.length) base.intervals = parsed.intervals;
  } else {
    const byKey = new Map(base.days.map((row) => [`${row.date}:${row.kind}`, row]));
    for (const row of parsed.days) {
      const key = `${row.date}:${row.kind}`;
      byKey.set(key, mergeDayRow(byKey.get(key), row));
    }
    base.days = Array.from(byKey.values());

    const monthly = new Map(base.monthly.map((row) => [`${row.year}-${row.month}`, row]));
    for (const row of parsed.monthly) {
      const key = `${row.year}-${row.month}`;
      monthly.set(key, { ...monthly.get(key), ...row });
    }
    base.monthly = Array.from(monthly.values());

    const goals = new Map(base.goals.map((row) => [row.year, row]));
    for (const row of parsed.goals) {
      goals.set(row.year, { ...goals.get(row.year), ...row });
    }
    base.goals = Array.from(goals.values()).sort((a, b) => a.year - b.year);

    const intervals = new Map(base.intervals.map((row) => [`${row.date}:${row.startMin}`, row]));
    for (const row of parsed.intervals) {
      const key = `${row.date}:${row.startMin}`;
      const prev = intervals.get(key);
      intervals.set(key, prev ? { ...prev, ...compact(row) } : row);
    }
    base.intervals = Array.from(intervals.values());
  }

  base.days = sortDays(base.days);
  base.intervals = sortIntervals(base.intervals);
  base.monthly.sort((a, b) => a.year - b.year || a.month - b.month);
  if (meta) base.lastImport = meta;
  return base;
}

export function upsertDay(state: ScorecardState, row: DailyRow): ScorecardState {
  const days = state.days.filter((d) => !(d.date === row.date && d.kind === row.kind));
  days.push(row);
  return { ...state, days: sortDays(days) };
}

export function upsertMonthly(state: ScorecardState, row: MonthlyManual): ScorecardState {
  const monthly = state.monthly.filter((m) => !(m.year === row.year && m.month === row.month));
  monthly.push(row);
  monthly.sort((a, b) => a.year - b.year || a.month - b.month);
  return { ...state, monthly };
}

export function upsertGoals(state: ScorecardState, row: ScorecardGoals): ScorecardState {
  const goals = state.goals.filter((g) => g.year !== row.year);
  goals.push(row);
  goals.sort((a, b) => a.year - b.year);
  return { ...state, goals };
}
