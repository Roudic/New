import {
  DEFAULT_GOALS_2025,
  DEFAULT_GOALS_2026,
  type DailyRow,
  type MonthlyManual,
  type ParseResult,
  type ParseWarning,
  type ScorecardGoals,
} from "./types";
import { tokenize, type Token } from "./tokens";
import { nearlyEqual, normalizePercent, normalizeScore, weekdayFromIso } from "./values";

const DATE_RE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
const DAY_STATUS_RE =
  /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Weekly Total)\s*(Open|Closed)$/i;
const MONTH_ROW_RE =
  /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(20\d{2})(.*)$/i;
const MONTH_INDEX: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

function toIso(month: string, day: string, year: string): string {
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function isFormulaResidue(value: number): boolean {
  return value === 0.01;
}

function assignSalesLabor(tokens: Token[]): {
  salesLy?: number;
  salesGoal?: number;
  salesActual?: number;
  laborGoal?: number;
  laborActual?: number;
} {
  const values = tokens
    .filter((t) => t.kind === "money" || t.kind === "number")
    .map((t) => t.value);

  if (values.length === 0) return {};

  const tryLayouts: number[][] = [];
  if (values.length >= 7) tryLayouts.push(values.slice(0, 7));
  if (values.length >= 6) tryLayouts.push([0, ...values.slice(0, 6)]);
  if (values.length >= 5) tryLayouts.push(values.slice(0, 5));
  tryLayouts.push(values);

  for (const layout of tryLayouts) {
    const [ly, goal, actual, vs, laborGoal, laborActual] = [
      layout[0],
      layout[1],
      layout[2],
      layout[3],
      layout[4],
      layout[5],
    ];
    if (goal != null && actual != null && vs != null && nearlyEqual(actual - goal, vs, 2)) {
      return {
        salesLy: ly,
        salesGoal: goal,
        salesActual: actual,
        laborGoal,
        laborActual,
      };
    }
  }

  if (values.length >= 3 && nearlyEqual(values[1] - values[0], values[2], 2)) {
    return {
      salesGoal: values[0],
      salesActual: values[1],
      laborGoal: values[3],
      laborActual: values[4],
    };
  }

  if (values[0] === 0 && values[1] === 0 && values.length >= 4) {
    return {
      salesLy: 0,
      salesGoal: 0,
      salesActual: 0,
      laborActual: values[values.length - 2] === 0 ? values[values.length - 1] : values[values.length - 2],
    };
  }

  return {
    salesLy: values[0],
    salesGoal: values[1],
    salesActual: values[2],
    laborActual: values[5] ?? values[3],
  };
}

function applyTrailing(row: DailyRow, tokens: Token[], kind: DailyRow["kind"]) {
  const laborPctAt = tokens.findIndex((t) => t.kind === "percent");
  const leftover = laborPctAt >= 0 ? tokens.slice(laborPctAt + 1) : tokens.slice(6);

  const productivity = leftover.find(
    (t) =>
      (t.kind === "money" || t.kind === "number") &&
      t.value > 1 &&
      t.value < 200 &&
      !Number.isInteger(t.value)
  );
  if (productivity) row.laborProductivity = productivity.value;

  const trans = leftover
    .filter((t) => t.kind === "number" && Number.isInteger(t.value) && t.value >= 0 && t.value <= 30000)
    .map((t) => t.value);
  if (trans[0] != null && trans[0] >= 20) row.transTy = trans[0];
  if (trans[1] != null) row.transLy = trans[1];

  const scores = leftover
    .filter((t) => {
      if (t === productivity) return false;
      if (t.kind === "percent") return true;
      return t.kind === "number" && t.value > 0 && t.value <= 100;
    })
    .filter((t) => !isFormulaResidue(t.value))
    .map((t) => normalizeScore(t.value))
    .filter((n): n is number => n != null && n > 1);

  if (kind === "week") {
    if (scores[0] != null && scores[0] >= 20) row.osat = scores[0];
  } else if (scores.length) {
    row.osat = scores[0];
    if (scores[1] != null) row.osatAccuracy = scores[1];
    if (scores[2] != null) row.osatClean = scores[2];
    if (scores[3] != null) row.osatTaste = scores[3];
    if (scores[4] != null) row.osatTemp = scores[4];
    if (scores[5] != null) row.osatFast = scores[5];
    if (scores[6] != null) row.osatCourteous = scores[6];
    if (scores[7] != null) row.osatPortion = scores[7];
  }

  const durations = leftover.filter((t) => t.kind === "duration").map((t) => t.value);
  if (durations[0] != null) row.dtSosTotalSec = durations[0];
  if (durations[1] != null) row.dtSosBreakfastSec = durations[1];
  if (durations[2] != null) row.dtSosLunchSec = durations[2];
  if (durations.length === 4) {
    row.dtSosDinnerSec = durations[3];
  } else if (durations.length >= 5) {
    row.dtSosAfternoonSec = durations[3];
    row.dtSosDinnerSec = durations[4];
  }

  const timers = leftover.find(
    (t) => t.kind === "number" && t.value > 100 && t.value < 5000 && String(t.raw).includes(".")
  );
  if (timers) row.timers = timers.value;
}

function parseDailyBlocks(lines: string[], warnings: ParseWarning[]): DailyRow[] {
  const start = lines.findIndex((line) =>
    /datedayopen\/closedsalesly/i.test(line.replace(/\s+/g, ""))
  );
  if (start < 0) {
    warnings.push({ message: "Could not find the Daily Data header in this file." });
    return [];
  }

  const days: DailyRow[] = [];
  let i = start + 1;
  while (i < lines.length) {
    const line = lines[i];
    if (/DRIVE-THRU DEEP DIVE/i.test(line) || /^MonthSales LY/i.test(line.replace(/\s+/g, ""))) {
      break;
    }
    const dateMatch = line.match(DATE_RE);
    if (!dateMatch) {
      i += 1;
      continue;
    }
    const date = toIso(dateMatch[1], dateMatch[2], dateMatch[3]);
    const metaLine = lines[i + 1] ?? "";
    const meta = metaLine.match(DAY_STATUS_RE);
    if (!meta) {
      i += 1;
      continue;
    }
    const kind: DailyRow["kind"] = /weekly/i.test(meta[1]) ? "week" : "day";
    const status: DailyRow["status"] = /closed/i.test(meta[2]) ? "Closed" : "Open";
    const chunk: string[] = [];
    i += 2;
    while (i < lines.length && !DATE_RE.test(lines[i]) && !/DRIVE-THRU DEEP DIVE/i.test(lines[i])) {
      chunk.push(lines[i]);
      i += 1;
    }
    const blob = chunk.join(" ");
    const tokens = tokenize(blob);
    const sales = assignSalesLabor(tokens);
    const row: DailyRow = {
      date,
      dayOfWeek: kind === "week" ? "Weekly Total" : weekdayFromIso(date),
      status: kind === "week" ? "Closed" : status,
      kind,
      salesLy: sales.salesLy,
      salesGoal: sales.salesGoal,
      salesActual: sales.salesActual,
      laborActual: sales.laborActual,
    };
    applyTrailing(row, tokens, kind);
    days.push(row);
  }
  return days;
}

function parseMonthly(text: string): MonthlyManual[] {
  const monthly: MonthlyManual[] = [];
  for (const raw of text.split(/\n/)) {
    const match = raw.match(MONTH_ROW_RE);
    if (!match) continue;
    const month = MONTH_INDEX[match[1].toLowerCase()];
    const year = Number(match[2]);
    if (!month || year < 2025) continue;
    const tokens = tokenize(match[3] ?? raw);
    const percents = tokens
      .filter((t) => t.kind === "percent")
      .map((t) => normalizePercent(t.value))
      .filter((n): n is number => n != null);
    const food = percents.length >= 3 ? percents[1] : percents.find((n) => n > 28 && n < 80);
    const profit = percents.length >= 3 ? percents[2] : percents.find((n) => n < 20);
    if (food == null && profit == null) continue;
    if ((food == null || food === 0) && (profit == null || profit === 0)) continue;
    monthly.push({ year, month, foodCostPct: food, netProfitPct: profit });
  }
  return monthly;
}

function readSetting(section: string, label: string): number | undefined {
  const escaped = label.replace(/[()]/g, "\\$&");
  const match = section.match(new RegExp(`${escaped}\\s*([\\d.,]+%?|-?[\\d.]+)`, "i"));
  if (!match) return undefined;
  if (/osat|food safety|food quality/i.test(label)) return normalizeScore(match[1]);
  if (/%/.test(label) || match[1].includes("%")) return normalizePercent(match[1]);
  return Number(match[1]);
}

function parseGoals(text: string, warnings: ParseWarning[]): ScorecardGoals[] {
  const goals: ScorecardGoals[] = [];
  const blocks = [
    { year: 2025, chunk: text.match(/2025 Settings[\s\S]*?(?=2026 Settings|$)/i)?.[0] ?? "" },
    { year: 2026, chunk: text.match(/2026 Settings[\s\S]*?(?=QuarterSales LY|MonthLabor %|$)/i)?.[0] ?? "" },
  ];

  for (const { year, chunk } of blocks) {
    if (!chunk.trim()) continue;
    const base = year === 2025 ? DEFAULT_GOALS_2025 : DEFAULT_GOALS_2026;
    const next: ScorecardGoals = {
      ...base,
      year,
      salesGrowthPct: readSetting(chunk, "Sales Growth Target %") ?? base.salesGrowthPct,
      laborTargetPct: readSetting(chunk, "Labor Target %") ?? base.laborTargetPct,
      foodCostTargetPct: readSetting(chunk, "Food Cost Target %") ?? base.foodCostTargetPct,
      netProfitTargetPct: readSetting(chunk, "Net Profit Target %") ?? base.netProfitTargetPct,
      osatGoal: readSetting(chunk, "OSAT Goal") ?? base.osatGoal,
      foodSafetyGoal: readSetting(chunk, "Food Safety Goal") ?? base.foodSafetyGoal,
      foodQualityGoal: readSetting(chunk, "Food Quality Goal") ?? base.foodQualityGoal,
      dtSosGoalMin: readSetting(chunk, "DT SOS Goal (minutes)") ?? base.dtSosGoalMin,
    };
    goals.push(next);
  }

  const dive = text.match(/Goal\s*5:00\s*\(300 sec\)/i);
  const twentySix = goals.find((g) => g.year === 2026);
  if (dive && twentySix && twentySix.dtSosGoalMin === 3.5) {
    twentySix.dtSosGoalMin = 5;
    warnings.push({
      message:
        "Goals tab lists DT SOS at 3.5 minutes, but the Drive-Thru Deep Dive uses a 5:00 goal. Applied 5:00 so variances match the scorecard.",
    });
  }

  return goals;
}

export function parseWorkbookText(text: string): ParseResult {
  const warnings: ParseWarning[] = [];
  const normalized = text.replace(/\r/g, "");
  const lines = normalized.split("\n").map((line) => line.trim()).filter(Boolean);
  const location = /CHICK-FIL-A\s+HUEYTOWN/i.test(text) ? "Chick-fil-A Hueytown" : undefined;

  const days = parseDailyBlocks(lines, warnings);
  if (days.length === 0) {
    warnings.push({ message: "No daily rows were detected. Try a CSV export of Daily Data." });
  }

  return {
    location,
    days,
    monthly: parseMonthly(normalized),
    goals: parseGoals(normalized, warnings),
    warnings,
    source: "pdf",
  };
}
