import {
  DEFAULT_GOALS_2026,
  type DailyRow,
  type KpiResult,
  type MonthlyManual,
  type MonthlyRollup,
  type QuarterlyRollup,
  type ScorecardGoals,
  type ScorecardState,
} from "./types";
import { monthLabel } from "./values";

export function goalsForYear(state: ScorecardState, year: number): ScorecardGoals {
  return state.goals.find((g) => g.year === year) ?? { ...DEFAULT_GOALS_2026, year };
}

export function monthlyManualFor(
  state: ScorecardState,
  year: number,
  month: number
): MonthlyManual | undefined {
  return state.monthly.find((m) => m.year === year && m.month === month);
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, n) => sum + n, 0) / values.length;
}

export function enrichDay(row: DailyRow, goals: ScorecardGoals) {
  const salesActual = row.salesActual;
  const salesGoal =
    row.salesGoal ??
    (row.salesLy != null ? row.salesLy * (1 + goals.salesGrowthPct / 100) : undefined);
  const laborGoal =
    salesActual != null ? salesActual * (goals.laborTargetPct / 100) : undefined;
  const laborPct =
    salesActual && salesActual !== 0 && row.laborActual != null
      ? (row.laborActual / salesActual) * 100
      : null;
  const salesVsGoal =
    salesActual != null && salesGoal != null ? salesActual - salesGoal : null;
  const laborVariance =
    row.laborActual != null && laborGoal != null ? row.laborActual - laborGoal : null;
  const transVariance =
    row.transTy != null && row.transLy != null ? row.transTy - row.transLy : null;
  const yoy =
    salesActual != null && row.salesLy && row.salesLy !== 0
      ? (salesActual / row.salesLy - 1) * 100
      : null;

  return {
    ...row,
    salesGoal,
    laborGoal,
    laborPct,
    salesVsGoal,
    laborVariance,
    transVariance,
    yoy,
  };
}

export function operatingDays(days: DailyRow[]): DailyRow[] {
  return days.filter(
    (d) => d.kind === "day" && d.status === "Open" && (d.salesActual || d.laborActual || d.transTy)
  );
}

export function hasMeaningfulData(row: DailyRow): boolean {
  return Boolean(
    (row.salesActual && row.salesActual !== 0) ||
      (row.laborActual && row.laborActual !== 0) ||
      (row.transTy && row.transTy !== 0) ||
      row.osat ||
      row.dtSosTotalSec ||
      row.kind === "week"
  );
}

export function latestDataDate(state: ScorecardState): string | null {
  const dated = operatingDays(state.days)
    .map((d) => d.date)
    .sort();
  return dated.at(-1) ?? null;
}

export function activeYearMonth(state: ScorecardState): { year: number; month: number } {
  const latest = latestDataDate(state);
  if (latest) {
    const [year, month] = latest.split("-").map(Number);
    return { year, month };
  }
  return { year: 2026, month: 6 };
}

export function daysInMonth(state: ScorecardState, year: number, month: number): DailyRow[] {
  const prefix = `${year}-${String(month).padStart(2, "0")}`;
  return state.days.filter((d) => d.date.startsWith(prefix));
}

export function rollupMonth(
  state: ScorecardState,
  year: number,
  month: number
): MonthlyRollup {
  const rows = operatingDays(daysInMonth(state, year, month));
  const overlay = monthlyManualFor(state, year, month);
  const salesActual = rows.reduce((s, r) => s + (r.salesActual ?? 0), 0);
  const salesGoal = rows.reduce((s, r) => s + (r.salesGoal ?? 0), 0);
  const salesLy = rows.reduce((s, r) => s + (r.salesLy ?? 0), 0);
  const laborActual = rows.reduce((s, r) => s + (r.laborActual ?? 0), 0);
  const transTy = rows.reduce((s, r) => s + (r.transTy ?? 0), 0);
  const transLy = rows.reduce((s, r) => s + (r.transLy ?? 0), 0);
  const laborPct = salesActual ? (laborActual / salesActual) * 100 : null;
  const osat = mean(rows.map((r) => r.osat).filter((n): n is number => n != null));
  const dtSosAvgSec = mean(
    rows.map((r) => r.dtSosTotalSec).filter((n): n is number => n != null)
  );
  const foodSafety = mean(
    rows.map((r) => r.foodSafety).filter((n): n is number => n != null)
  );
  const foodQuality = mean(
    rows.map((r) => r.foodQuality).filter((n): n is number => n != null)
  );

  return {
    year,
    month,
    label: `${monthLabel(month)} ${year}`,
    salesLy,
    salesGoal,
    salesActual,
    laborActual,
    laborPct,
    osat,
    foodCostPct: overlay?.foodCostPct ?? null,
    netProfitPct: overlay?.netProfitPct ?? null,
    transTy,
    transLy,
    dtSosAvgSec,
    foodSafety,
    foodQuality,
    operatingDays: rows.length,
  };
}

export function rollupRange(
  state: ScorecardState,
  year: number,
  months: number[]
): MonthlyRollup {
  const parts = months.map((month) => rollupMonth(state, year, month));
  const salesActual = parts.reduce((s, p) => s + p.salesActual, 0);
  const laborActual = parts.reduce((s, p) => s + p.laborActual, 0);
  const withOsat = parts.filter((p) => p.osat != null);
  const withSos = parts.filter((p) => p.dtSosAvgSec != null);
  const food = parts.find((p) => p.foodCostPct != null);
  const profit = parts.find((p) => p.netProfitPct != null);

  return {
    year,
    month: months[0] ?? 1,
    label: `${year}`,
    salesLy: parts.reduce((s, p) => s + p.salesLy, 0),
    salesGoal: parts.reduce((s, p) => s + p.salesGoal, 0),
    salesActual,
    laborActual,
    laborPct: salesActual ? (laborActual / salesActual) * 100 : null,
    osat: withOsat.length ? mean(withOsat.map((p) => p.osat as number)) : null,
    foodCostPct: food?.foodCostPct ?? null,
    netProfitPct: profit?.netProfitPct ?? null,
    transTy: parts.reduce((s, p) => s + p.transTy, 0),
    transLy: parts.reduce((s, p) => s + p.transLy, 0),
    dtSosAvgSec: withSos.length ? mean(withSos.map((p) => p.dtSosAvgSec as number)) : null,
    foodSafety: mean(
      parts.map((p) => p.foodSafety).filter((n): n is number => n != null)
    ),
    foodQuality: mean(
      parts.map((p) => p.foodQuality).filter((n): n is number => n != null)
    ),
    operatingDays: parts.reduce((s, p) => s + p.operatingDays, 0),
  };
}

export function quarterlyRollups(state: ScorecardState, year: number): QuarterlyRollup[] {
  const groups = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
    [10, 11, 12],
  ];
  return groups.map((months, index) => {
    const rollup = rollupRange(state, year, months);
    return {
      ...rollup,
      quarter: index + 1,
      label: `Q${index + 1} ${year}`,
      month: months[0],
    };
  });
}

function kpiStatus(
  value: number | null,
  goal: number | null,
  direction: "higher" | "lower"
): KpiResult["status"] {
  if (value == null || goal == null) return "na";
  if (direction === "higher") return value + 0.0001 >= goal ? "on_track" : "behind";
  return value - 0.0001 <= goal ? "on_track" : "behind";
}

export function monthKpis(state: ScorecardState, year: number, month: number): KpiResult[] {
  const goals = goalsForYear(state, year);
  const rollup = rollupMonth(state, year, month);
  const items: Array<Omit<KpiResult, "status" | "variance"> & { variance?: number | null }> = [
    {
      key: "sales",
      label: "MTD Sales",
      value: rollup.salesActual || null,
      goal: rollup.salesGoal || null,
      unit: "money",
      direction: "higher",
    },
    {
      key: "labor",
      label: "Labor %",
      value: rollup.laborPct,
      goal: goals.laborTargetPct,
      unit: "percent",
      direction: "lower",
    },
    {
      key: "osat",
      label: "OSAT Score",
      value: rollup.osat,
      goal: goals.osatGoal,
      unit: "score",
      direction: "higher",
    },
    {
      key: "food",
      label: "Food Cost %",
      value: rollup.foodCostPct,
      goal: goals.foodCostTargetPct,
      unit: "percent",
      direction: "lower",
    },
    {
      key: "profit",
      label: "Net Profit %",
      value: rollup.netProfitPct,
      goal: goals.netProfitTargetPct,
      unit: "percent",
      direction: "higher",
    },
    {
      key: "trans",
      label: "Transactions",
      value: rollup.transTy || null,
      goal: null,
      unit: "count",
      direction: "higher",
    },
  ];

  return items.map((item) => {
    const variance =
      item.value != null && item.goal != null ? item.value - item.goal : null;
    return {
      ...item,
      variance,
      status: kpiStatus(item.value, item.goal, item.direction),
    };
  });
}

export function yoyRows(state: ScorecardState, year = 2026) {
  const current = rollupRange(state, year, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  const prior = rollupRange(state, year - 1, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  const goals = goalsForYear(state, year);

  const row = (
    metric: string,
    cur: number | null,
    prev: number | null,
    unit: KpiResult["unit"]
  ) => {
    const change = cur != null && prev != null ? cur - prev : cur;
    const pct =
      cur != null && prev != null && prev !== 0 ? ((cur - prev) / Math.abs(prev)) * 100 : null;
    return { metric, prior: prev, current: cur, change, pct, unit };
  };

  return [
    row("Sales", current.salesActual || null, prior.salesActual || null, "money"),
    row("Labor $", current.laborActual || null, prior.laborActual || null, "money"),
    row("Labor %", current.laborPct, prior.laborPct, "percent"),
    row("Food Cost %", current.foodCostPct, prior.foodCostPct, "percent"),
    row("Net Profit %", current.netProfitPct, prior.netProfitPct, "percent"),
    row("OSAT", current.osat, prior.osat, "score"),
    row("Food Safety", current.foodSafety, prior.foodSafety, "score"),
    row("Food Quality", current.foodQuality, prior.foodQuality, "score"),
    row("DT SOS", current.dtSosAvgSec, prior.dtSosAvgSec, "time"),
    row("Transactions", current.transTy || null, prior.transTy || null, "count"),
    row("Labor target", goals.laborTargetPct, goalsForYear(state, year - 1).laborTargetPct, "percent"),
  ];
}

export function sosBand(seconds: number | null | undefined): "good" | "watch" | "hot" | "na" {
  if (seconds == null) return "na";
  if (seconds <= 5 * 60) return "good";
  if (seconds <= 7.5 * 60) return "watch";
  return "hot";
}
