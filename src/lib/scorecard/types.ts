export type DayStatus = "Open" | "Closed";
export type RowKind = "day" | "week";
export type Daypart = "breakfast" | "lunch" | "afternoon" | "dinner";
export type DailyOrigin = "daily" | "interval" | "cems" | "sos";
export type ScorecardKind = "daily" | "monthly" | "goals" | "interval" | "cems" | "sos";

export interface IntervalRow {
  date: string;
  dayOfWeek: string;
  startMin: number;
  label: string;
  daypart: Daypart;
  sales?: number;
  trans?: number;
  cars?: number;
  sosSec?: number;
  orderSec?: number;
  windowSec?: number;
  labor?: number;
  hours?: number;
}

export interface DailyRow {
  date: string;
  dayOfWeek: string;
  status: DayStatus;
  kind: RowKind;
  salesLy?: number;
  salesGoal?: number;
  salesActual?: number;
  laborActual?: number;
  laborProductivity?: number;
  transTy?: number;
  transLy?: number;
  osat?: number;
  osatAccuracy?: number;
  osatClean?: number;
  osatTaste?: number;
  osatTemp?: number;
  osatFast?: number;
  osatCourteous?: number;
  osatPortion?: number;
  foodSafety?: number;
  foodQuality?: number;
  dtSosTotalSec?: number;
  dtSosBreakfastSec?: number;
  dtSosLunchSec?: number;
  dtSosAfternoonSec?: number;
  dtSosDinnerSec?: number;
  catering?: number;
  timers?: number;
  schedHours?: number;
  actualHours?: number;
  fsa?: number;
  rsa?: number;
  donations?: number;
  pto?: number;
  notes?: string;
  origin?: DailyOrigin;
}

export interface MonthlyManual {
  year: number;
  month: number;
  foodCostPct?: number;
  netProfitPct?: number;
}

export interface ScorecardGoals {
  year: number;
  salesGrowthPct: number;
  laborTargetPct: number;
  foodCostTargetPct: number;
  netProfitTargetPct: number;
  osatGoal: number;
  foodSafetyGoal: number;
  foodQualityGoal: number;
  dtSosGoalMin: number;
}

export interface ImportMeta {
  at: string;
  filename: string;
  kind: "csv" | "pdf" | "manual";
  rows: number;
  warnings: string[];
}

export interface ScorecardState {
  location: string;
  days: DailyRow[];
  monthly: MonthlyManual[];
  goals: ScorecardGoals[];
  intervals: IntervalRow[];
  lastImport?: ImportMeta;
}

export interface ParseWarning {
  message: string;
  line?: number;
}

export interface ParseResult {
  location?: string;
  days: DailyRow[];
  monthly: MonthlyManual[];
  goals: ScorecardGoals[];
  intervals: IntervalRow[];
  warnings: ParseWarning[];
  kinds: ScorecardKind[];
  source: "csv" | "pdf";
}

export type MetricDirection = "higher" | "lower";

export interface KpiResult {
  key: string;
  label: string;
  value: number | null;
  goal: number | null;
  variance: number | null;
  unit: "money" | "percent" | "score" | "count" | "time";
  direction: MetricDirection;
  status: "on_track" | "behind" | "na";
}

export interface MonthlyRollup {
  year: number;
  month: number;
  label: string;
  salesLy: number;
  salesGoal: number;
  salesActual: number;
  laborActual: number;
  laborPct: number | null;
  osat: number | null;
  foodCostPct: number | null;
  netProfitPct: number | null;
  transTy: number;
  transLy: number;
  dtSosAvgSec: number | null;
  foodSafety: number | null;
  foodQuality: number | null;
  operatingDays: number;
}

export interface QuarterlyRollup extends MonthlyRollup {
  quarter: number;
}

export const SCORECARD_STORAGE_KEY = "cfa-hueytown-scorecard";
export const DEFAULT_LOCATION = "Chick-fil-A Hueytown";

export const DEFAULT_GOALS_2026: ScorecardGoals = {
  year: 2026,
  salesGrowthPct: 0,
  laborTargetPct: 20,
  foodCostTargetPct: 30,
  netProfitTargetPct: 10.5,
  osatGoal: 85,
  foodSafetyGoal: 100,
  foodQualityGoal: 100,
  dtSosGoalMin: 5,
};

export const DEFAULT_GOALS_2025: ScorecardGoals = {
  year: 2025,
  salesGrowthPct: 5,
  laborTargetPct: 18,
  foodCostTargetPct: 29,
  netProfitTargetPct: 12,
  osatGoal: 85,
  foodSafetyGoal: 100,
  foodQualityGoal: 100,
  dtSosGoalMin: 3.5,
};

export function emptyScorecard(): ScorecardState {
  return {
    location: DEFAULT_LOCATION,
    days: [],
    monthly: [],
    goals: [DEFAULT_GOALS_2025, DEFAULT_GOALS_2026],
    intervals: [],
  };
}

export const DAYPART_LABEL: Record<Daypart, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  afternoon: "Afternoon",
  dinner: "Dinner",
};

export const OSAT_ATTRIBUTES: Array<{
  key: keyof DailyRow;
  label: string;
}> = [
  { key: "osat", label: "Overall satisfaction" },
  { key: "osatAccuracy", label: "Accuracy" },
  { key: "osatClean", label: "Clean" },
  { key: "osatTaste", label: "Taste" },
  { key: "osatTemp", label: "Temp" },
  { key: "osatFast", label: "Fast" },
  { key: "osatCourteous", label: "Courteous" },
  { key: "osatPortion", label: "Portion size" },
];

export function emptyParseResult(source: "csv" | "pdf"): ParseResult {
  return {
    days: [],
    monthly: [],
    goals: [],
    intervals: [],
    warnings: [],
    kinds: [],
    source,
  };
}

export function hasParseableContent(parsed: ParseResult): boolean {
  return (
    parsed.days.length > 0 ||
    parsed.monthly.length > 0 ||
    parsed.goals.length > 0 ||
    parsed.intervals.length > 0
  );
}
