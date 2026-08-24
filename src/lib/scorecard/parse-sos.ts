import { emptyParseResult, type DailyRow, type Daypart, type ParseResult } from "./types";
import {
  extractReportDate,
  inferYear,
  parseDurationSeconds,
  parseNumber,
  parseShortDate,
  weekdayFromIso,
} from "./values";

const SOS_CONTEXT_RE =
  /speed\s*of\s*service|drive[-\s]?thru|dt\s*sos|\bsos\b|cars\s+in\s+queue/i;
const DASHBOARD_RE =
  /(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)(?:[ \t]+|\n)(\d{1,2}:\d{2}(?::\d{2})?)(?:[ \t]+|\n)([+-]\d+(?:\.\d+)?%)/g;
const GLUED_DASHBOARD_RE =
  /(\d{1,2}\/\d{1,2}\/\d{2,4})(\d{1,2}:\d{2}(?::\d{2})?)([+-]\d+(?:\.\d+)?%)/g;
const DATE_DURATION_RE =
  /(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)[ \t]+(\d{1,2}:\d{2}(?::\d{2})?)/g;
const DAYPART_LABELS: Array<{ key: keyof DailyRow; daypart?: Daypart; pattern: RegExp }> = [
  { key: "dtSosBreakfastSec", daypart: "breakfast", pattern: /breakfast/i },
  { key: "dtSosLunchSec", daypart: "lunch", pattern: /lunch/i },
  { key: "dtSosAfternoonSec", daypart: "afternoon", pattern: /afternoon/i },
  { key: "dtSosDinnerSec", daypart: "dinner", pattern: /dinner/i },
  { key: "dtSosTotalSec", pattern: /(?:dt\s*)?sos(?:\s*total)?|total(?:\s*time)?|speed\s*of\s*service/i },
];

function plausibleSos(seconds: number, variancePct?: number, goalSec = 300): boolean {
  if (seconds < 30 || seconds > 45 * 60) return false;
  if (variancePct == null) return true;
  const implied = goalSec * (1 + variancePct / 100);
  return Math.abs(seconds - implied) < 90;
}

function toIso(raw: string, year: number): string | undefined {
  return parseShortDate(raw, year);
}

function upsert(
  map: Map<string, DailyRow>,
  date: string,
  patch: Partial<DailyRow>
): DailyRow {
  const prev = map.get(date) ?? {
    date,
    dayOfWeek: weekdayFromIso(date),
    status: "Open" as const,
    kind: "day" as const,
    origin: "sos" as const,
  };
  const next = { ...prev, origin: prev.origin ?? "sos", ...patch };
  map.set(date, next);
  return next;
}

function varianceNumber(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  return parseNumber(raw.replace("%", ""));
}

export function looksLikeSosReport(text: string): boolean {
  if (DASHBOARD_RE.test(text) || GLUED_DASHBOARD_RE.test(text)) return true;
  DASHBOARD_RE.lastIndex = 0;
  GLUED_DASHBOARD_RE.lastIndex = 0;
  return SOS_CONTEXT_RE.test(text) && /\d{1,2}:\d{2}(?::\d{2})?/.test(text);
}

function collectDashboard(text: string, year: number, map: Map<string, DailyRow>) {
  const patterns = [DASHBOARD_RE, GLUED_DASHBOARD_RE];
  for (const re of patterns) {
    re.lastIndex = 0;
    for (const match of Array.from(text.matchAll(re))) {
      const date = toIso(match[1], year);
      const seconds = parseDurationSeconds(match[2]);
      const variance = varianceNumber(match[3]);
      if (!date || seconds == null || !plausibleSos(seconds, variance)) continue;
      const prev = map.get(date);
      if (prev?.dtSosTotalSec != null && prev.origin !== "sos") continue;
      upsert(map, date, { dtSosTotalSec: seconds });
    }
  }
}

function collectDateDurations(text: string, year: number, map: Map<string, DailyRow>) {
  DATE_DURATION_RE.lastIndex = 0;
  for (const match of Array.from(text.matchAll(DATE_DURATION_RE))) {
    const date = toIso(match[1], year);
    const seconds = parseDurationSeconds(match[2]);
    if (!date || seconds == null || !plausibleSos(seconds)) continue;
    const around = text.slice(Math.max(0, match.index! - 80), match.index! + match[0].length + 80);
    const hasContext = SOS_CONTEXT_RE.test(around) || /[+-]\d+(?:\.\d+)?%/.test(around);
    const already = map.get(date)?.dtSosTotalSec;
    if (!hasContext && already != null) continue;
    if (!hasContext && !/^\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\s+\d{1,2}:\d{2}/.test(match[0])) continue;
    if (already == null) upsert(map, date, { dtSosTotalSec: seconds });
  }
}

function collectBareDuration(text: string, map: Map<string, DailyRow>) {
  const date = extractReportDate(text);
  if (!date) return;
  const durs = Array.from(text.matchAll(/\b(\d{1,2}:\d{2}(?::\d{2})?)\b/g));
  for (const match of durs) {
    const seconds = parseDurationSeconds(match[1]);
    if (seconds == null || !plausibleSos(seconds)) continue;
    if (map.get(date)?.dtSosTotalSec == null) {
      upsert(map, date, { dtSosTotalSec: seconds });
    }
    break;
  }
}

function collectDayparts(text: string, map: Map<string, DailyRow>) {
  const date = extractReportDate(text);
  if (!date) return;
  for (const { key, pattern } of DAYPART_LABELS) {
    const match = text.match(
      new RegExp(`(?:${pattern.source})\\s*[:\\-]?\\s*(\\d{1,2}:\\d{2}(?::\\d{2})?|\\d+(?:\\.\\d+)?)`, "i")
    );
    if (!match) continue;
    const seconds = parseDurationSeconds(match[1]);
    if (seconds == null || !plausibleSos(seconds)) continue;
    upsert(map, date, { [key]: seconds });
  }
}

export function parseSosText(text: string, source: "csv" | "pdf" = "csv"): ParseResult {
  const result = emptyParseResult(source);
  if (!looksLikeSosReport(text) && !/\d{1,2}\/\d{1,2}\s+\d{1,2}:\d{2}/.test(text) && !/0:\d{2}:\d{2}/.test(text)) {
    return result;
  }

  const year = inferYear(text);
  const map = new Map<string, DailyRow>();
  collectDashboard(text, year, map);
  collectDateDurations(text, year, map);
  collectDayparts(text, map);
  if (!map.size) collectBareDuration(text, map);

  result.days = Array.from(map.values());
  if (result.days.length) result.kinds = ["sos"];
  return result;
}
