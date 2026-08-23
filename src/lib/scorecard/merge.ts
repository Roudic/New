import type { DailyRow, MonthlyManual, ParseResult, ScorecardGoals, ScorecardState } from "./types";
import { emptyScorecard } from "./types";

function sortDays(days: DailyRow[]): DailyRow[] {
  return [...days].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if (a.kind === b.kind) return 0;
    return a.kind === "day" ? -1 : 1;
  });
}

export function mergeParseResult(
  current: ScorecardState | null | undefined,
  parsed: ParseResult,
  mode: "merge" | "replace" = "merge",
  meta?: ScorecardState["lastImport"]
): ScorecardState {
  const base = mode === "replace" || !current ? emptyScorecard() : structuredClone(current);

  if (parsed.location) base.location = parsed.location;

  if (mode === "replace") {
    if (parsed.days.length) base.days = parsed.days;
    if (parsed.monthly.length) base.monthly = parsed.monthly;
    if (parsed.goals.length) base.goals = parsed.goals;
  } else {
    const byKey = new Map(base.days.map((row) => [`${row.date}:${row.kind}`, row]));
    for (const row of parsed.days) {
      const key = `${row.date}:${row.kind}`;
      const prev = byKey.get(key);
      byKey.set(key, prev ? { ...prev, ...compact(row) } : row);
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
  }

  base.days = sortDays(base.days);
  base.monthly.sort((a, b) => a.year - b.year || a.month - b.month);
  if (meta) base.lastImport = meta;
  return base;
}

function compact<T extends object>(row: T): Partial<T> {
  const next: Partial<T> = {};
  for (const [key, value] of Object.entries(row) as Array<[keyof T, T[keyof T]]>) {
    if (value !== undefined && value !== null && value !== "") {
      next[key] = value;
    }
  }
  return next;
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
