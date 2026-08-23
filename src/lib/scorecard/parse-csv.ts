import { normalizeHeader, parseCsvRows } from "./csv-rows";
import { combineParseResults } from "./merge";
import { looksLikeCemsReport, parseCemsText } from "./parse-cems";
import { looksLikeIntervalReport, parseIntervalText } from "./parse-interval";
import { parseSosText } from "./parse-sos";
import type { DailyRow, MonthlyManual, ParseResult, ParseWarning, ScorecardGoals } from "./types";
import { DEFAULT_GOALS_2026, emptyParseResult } from "./types";
import {
  isBlank,
  normalizePercent,
  normalizeScore,
  parseDateToken,
  parseDurationSeconds,
  parseNumber,
  weekdayFromIso,
} from "./values";

const HEADER_ALIASES: Record<string, string> = {
  date: "date",
  day: "dayOfWeek",
  dayofweek: "dayOfWeek",
  openclosed: "status",
  status: "status",
  salesly: "salesLy",
  saleslastyear: "salesLy",
  salesgoal: "salesGoal",
  salesactual: "salesActual",
  sales: "salesActual",
  salesvsgoal: "salesVsGoal",
  labordoal: "laborGoal",
  laborgoal: "laborGoal",
  laboractual: "laborActual",
  labor: "laborActual",
  laborvariance: "laborVariance",
  laborpct: "laborPct",
  laborpercent: "laborPct",
  laborproductivity: "laborProductivity",
  transty: "transTy",
  transthisyear: "transTy",
  trans: "transTy",
  transactions: "transTy",
  transly: "transLy",
  transvariance: "transVariance",
  foodcost: "foodCostPct",
  foodcostpct: "foodCostPct",
  netprofit: "netProfitPct",
  netprofitpct: "netProfitPct",
  osat: "osat",
  osataccuracy: "osatAccuracy",
  osatclean: "osatClean",
  osattaste: "osatTaste",
  osattemp: "osatTemp",
  osatfast: "osatFast",
  osatcourteous: "osatCourteous",
  osatportionsize: "osatPortion",
  foodsafety: "foodSafety",
  foodquality: "foodQuality",
  dtsostotal: "dtSosTotalSec",
  dtsos: "dtSosTotalSec",
  speedofservice: "dtSosTotalSec",
  dtsosbreakfast: "dtSosBreakfastSec",
  dtsoslunch: "dtSosLunchSec",
  dtsosafternoon: "dtSosAfternoonSec",
  dtsosdinner: "dtSosDinnerSec",
  catering: "catering",
  timers: "timers",
  schedhours: "schedHours",
  actualhours: "actualHours",
  fsa: "fsa",
  rsa: "rsa",
  donations: "donations",
  pto: "pto",
  notes: "notes",
  year: "year",
  month: "month",
  kind: "kind",
};

function mapHeader(header: string): string | undefined {
  const key = normalizeHeader(header);
  if (HEADER_ALIASES[key]) return HEADER_ALIASES[key];
  if (key.startsWith("trans") && key.includes("ty")) return "transTy";
  if (key.startsWith("trans") && key.includes("ly")) return "transLy";
  return undefined;
}

export { parseCsvRows } from "./csv-rows";

function fieldNumber(row: Record<string, string>, key: string): number | undefined {
  return parseNumber(row[key]);
}

function fieldPercent(row: Record<string, string>, key: string): number | undefined {
  return normalizePercent(row[key]);
}

function fieldScore(row: Record<string, string>, key: string): number | undefined {
  return normalizeScore(row[key]);
}

function fieldDuration(row: Record<string, string>, key: string): number | undefined {
  return parseDurationSeconds(row[key]);
}

function detectKind(
  rows: string[][],
  text: string
): "daily" | "monthly" | "goals" | "interval" | "cems" | "unknown" {
  if (looksLikeIntervalReport(text)) return "interval";
  if (looksLikeCemsReport(text)) return "cems";
  const headers = rows[0]?.map(normalizeHeader) ?? [];
  if (headers.includes("date") || headers.includes("salesactual")) return "daily";
  if (headers.includes("month") && (headers.includes("foodcostpct") || headers.includes("foodcost"))) {
    return "monthly";
  }
  if (headers.includes("labortarget") || headers.includes("osatgoal") || headers.includes("year")) {
    return "goals";
  }
  return "unknown";
}

function toRecord(headers: string[], cells: string[]): Record<string, string> {
  const record: Record<string, string> = {};
  headers.forEach((header, index) => {
    const key = mapHeader(header);
    if (key) record[key] = cells[index] ?? "";
  });
  return record;
}

function parseDailyCsv(headers: string[], body: string[][], warnings: ParseWarning[]): DailyRow[] {
  const days: DailyRow[] = [];
  body.forEach((cells, index) => {
    const record = toRecord(headers, cells);
    const date = parseDateToken(record.date);
    if (!date) {
      warnings.push({ message: `Row ${index + 2} is missing a usable date.`, line: index + 2 });
      return;
    }
    const status: DailyRow["status"] = /closed/i.test(record.status ?? "") ? "Closed" : "Open";
    const kind: DailyRow["kind"] = /week/i.test(record.kind ?? record.dayOfWeek ?? "")
      ? "week"
      : "day";
    days.push({
      date,
      dayOfWeek: record.dayOfWeek || weekdayFromIso(date),
      status,
      kind,
      salesLy: fieldNumber(record, "salesLy"),
      salesGoal: fieldNumber(record, "salesGoal"),
      salesActual: fieldNumber(record, "salesActual"),
      laborActual: fieldNumber(record, "laborActual"),
      laborProductivity: fieldNumber(record, "laborProductivity"),
      transTy: fieldNumber(record, "transTy"),
      transLy: fieldNumber(record, "transLy"),
      osat: fieldScore(record, "osat"),
      osatAccuracy: fieldScore(record, "osatAccuracy"),
      osatClean: fieldScore(record, "osatClean"),
      osatTaste: fieldScore(record, "osatTaste"),
      osatTemp: fieldScore(record, "osatTemp"),
      osatFast: fieldScore(record, "osatFast"),
      osatCourteous: fieldScore(record, "osatCourteous"),
      osatPortion: fieldScore(record, "osatPortion"),
      foodSafety: fieldScore(record, "foodSafety"),
      foodQuality: fieldScore(record, "foodQuality"),
      dtSosTotalSec: fieldDuration(record, "dtSosTotalSec"),
      dtSosBreakfastSec: fieldDuration(record, "dtSosBreakfastSec"),
      dtSosLunchSec: fieldDuration(record, "dtSosLunchSec"),
      dtSosAfternoonSec: fieldDuration(record, "dtSosAfternoonSec"),
      dtSosDinnerSec: fieldDuration(record, "dtSosDinnerSec"),
      catering: fieldNumber(record, "catering"),
      timers: fieldNumber(record, "timers"),
      schedHours: fieldNumber(record, "schedHours"),
      actualHours: fieldNumber(record, "actualHours"),
      fsa: fieldNumber(record, "fsa"),
      rsa: fieldNumber(record, "rsa"),
      donations: fieldNumber(record, "donations"),
      pto: fieldNumber(record, "pto"),
      notes: isBlank(record.notes) ? undefined : record.notes,
    });
  });
  return days;
}

function parseMonthlyCsv(headers: string[], body: string[][]): MonthlyManual[] {
  const rows: MonthlyManual[] = [];
  for (const cells of body) {
    const record = toRecord(headers, cells);
    const year = fieldNumber(record, "year");
    let month = fieldNumber(record, "month");
    if (month == null && record.month) {
      const names: Record<string, number> = {
        jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
        may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, september: 9,
        oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
      };
      month = names[record.month.toLowerCase()];
    }
    if (!year || !month) continue;
    rows.push({
      year,
      month,
      foodCostPct: fieldPercent(record, "foodCostPct"),
      netProfitPct: fieldPercent(record, "netProfitPct"),
    });
  }
  return rows;
}

function parseGoalsCsv(headers: string[], body: string[][]): ScorecardGoals[] {
  return body
    .map((cells) => {
      const record = toRecord(headers, cells);
      const year = fieldNumber(record, "year") ?? DEFAULT_GOALS_2026.year;
      return {
        ...DEFAULT_GOALS_2026,
        year,
        salesGrowthPct: fieldPercent(record, "salesGrowthPct") ?? DEFAULT_GOALS_2026.salesGrowthPct,
        laborTargetPct: fieldPercent(record, "laborTargetPct") ?? fieldPercent(record, "laborPct") ?? DEFAULT_GOALS_2026.laborTargetPct,
        foodCostTargetPct: fieldPercent(record, "foodCostTargetPct") ?? DEFAULT_GOALS_2026.foodCostTargetPct,
        netProfitTargetPct: fieldPercent(record, "netProfitTargetPct") ?? DEFAULT_GOALS_2026.netProfitTargetPct,
        osatGoal: fieldScore(record, "osatGoal") ?? DEFAULT_GOALS_2026.osatGoal,
        foodSafetyGoal: fieldScore(record, "foodSafetyGoal") ?? DEFAULT_GOALS_2026.foodSafetyGoal,
        foodQualityGoal: fieldScore(record, "foodQualityGoal") ?? DEFAULT_GOALS_2026.foodQualityGoal,
        dtSosGoalMin: fieldNumber(record, "dtSosGoalMin") ?? DEFAULT_GOALS_2026.dtSosGoalMin,
      } satisfies ScorecardGoals;
    });
}

function parseCsvCore(text: string): ParseResult {
  const warnings: ParseWarning[] = [];
  const rows = parseCsvRows(text);
  if (rows.length < 2) {
    return {
      ...emptyParseResult("csv"),
      warnings: [{ message: "CSV needs a header row and at least one data row." }],
    };
  }

  const headers = rows[0];
  const body = rows.slice(1);
  const mapped = headers.map(mapHeader).filter(Boolean);
  if (mapped.length < 2) {
    warnings.push({
      message:
        "Could not recognize enough column headers. Use the Daily Data, 15-minute, or CEMS template.",
    });
  }

  const kind = detectKind(rows, text);
  const days = kind === "monthly" || kind === "goals" ? [] : parseDailyCsv(headers, body, warnings);
  const monthly = kind === "monthly" ? parseMonthlyCsv(headers, body) : [];
  const goals = kind === "goals" ? parseGoalsCsv(headers, body) : [];

  if (kind === "unknown" && days.length === 0) {
    warnings.push({ message: "CSV format was not recognized as daily, monthly, or goals data." });
  }

  const kinds =
    kind === "daily" || kind === "monthly" || kind === "goals" ? [kind] : days.length ? (["daily"] as const) : [];

  return {
    days: days.map((row) => ({ ...row, origin: row.origin ?? "daily" })),
    monthly,
    goals,
    intervals: [],
    warnings,
    kinds: [...kinds],
    source: "csv",
  };
}

export function parseCsvText(text: string): ParseResult {
  const kind = detectKind(parseCsvRows(text), text);
  const parts: ParseResult[] = [];
  if (kind === "interval" || looksLikeIntervalReport(text)) {
    parts.push(parseIntervalText(text, "csv"));
  }
  if (kind === "cems" || looksLikeCemsReport(text)) {
    parts.push(parseCemsText(text, "csv"));
  }
  if (kind === "daily" || kind === "monthly" || kind === "goals" || kind === "unknown") {
    parts.push(parseCsvCore(text));
  }
  parts.push(parseSosText(text, "csv"));
  return combineParseResults("csv", parts);
}

export const DAILY_CSV_TEMPLATE = `Date,Day,Open/Closed,Sales LY,Sales Goal,Sales Actual,Labor Actual $,Labor %,Labor Productivity,Trans TY,Trans LY,OSAT,OSAT Accuracy,OSAT Clean,OSAT Taste,OSAT Temp,OSAT Fast,OSAT Courteous,DT SOS Total,DT SOS Breakfast,DT SOS Lunch,DT SOS Afternoon,DT SOS Dinner,Timers
2026-06-12,Friday,Open,0,30000,31395,6998,22.29,58.36,1998,0,,,,,,,7:03,4:36,5:40,6:06,11:51,537.9
`;

export const MONTHLY_CSV_TEMPLATE = `Year,Month,Food Cost %,Net Profit %
2026,5,36.64,-11.30
`;

export const GOALS_CSV_TEMPLATE = `Year,Sales Growth Target %,Labor Target %,Food Cost Target %,Net Profit Target %,OSAT Goal,Food Safety Goal,Food Quality Goal,DT SOS Goal (minutes)
2026,0,20,30,10.5,85,100,100,5
`;
