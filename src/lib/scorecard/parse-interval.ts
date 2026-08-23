import { parseCsvRows, normalizeHeader } from "./csv-rows";
import {
  emptyParseResult,
  type DailyRow,
  type Daypart,
  type IntervalRow,
  type ParseResult,
} from "./types";
import {
  daypartFromMinutes,
  extractReportDate,
  minutesToLabel,
  parseClockToMinutes,
  parseDateToken,
  parseDurationSeconds,
  parseNumber,
  weekdayFromIso,
  weekdayFromText,
} from "./values";

const HEADER_ALIASES: Record<string, string> = {
  date: "date",
  businessdate: "date",
  reportdate: "date",
  day: "dayOfWeek",
  dayofweek: "dayOfWeek",
  weekday: "dayOfWeek",
  time: "time",
  interval: "time",
  start: "time",
  starttime: "time",
  period: "time",
  sales: "sales",
  netsales: "sales",
  salesactual: "sales",
  trans: "trans",
  transactions: "trans",
  transcount: "trans",
  guestcount: "trans",
  guests: "trans",
  cars: "cars",
  carcount: "cars",
  vehicles: "cars",
  sos: "sos",
  dtsos: "sos",
  speedofservice: "sos",
  totaltime: "sos",
  servicetime: "sos",
  averagesos: "sos",
  order: "order",
  ordertime: "order",
  window: "window",
  windowtime: "window",
  labor: "labor",
  hours: "hours",
};

const QUARTER_MINUTES = new Set([0, 15, 30, 45]);

function mapHeader(header: string): string | undefined {
  const key = normalizeHeader(header);
  return HEADER_ALIASES[key];
}

function looksLikeIntervalTitle(text: string): boolean {
  return /15\s*[-–]?\s*min(?:ute)?s?|quarter\s*hour/i.test(text);
}

function isQuarterClock(raw: string): boolean {
  const minutes = parseClockToMinutes(raw);
  if (minutes == null) return false;
  return QUARTER_MINUTES.has(minutes % 60);
}

export function looksLikeIntervalReport(text: string): boolean {
  if (looksLikeIntervalTitle(text)) return true;
  const rows = parseCsvRows(text);
  const headerAt = headerRowIndex(rows);
  if (headerAt < 0) return false;
  const mapped = rows[headerAt].map(mapHeader).filter(Boolean);
  return mapped.some((key) => ["sales", "trans", "cars", "sos"].includes(key ?? ""));
}

function headerRowIndex(rows: string[][]): number {
  return rows.findIndex((row) => {
    const mapped = row.map(mapHeader).filter(Boolean);
    return mapped.includes("time") && mapped.length >= 2;
  });
}

function toRecord(headers: string[], cells: string[]): Record<string, string> {
  const record: Record<string, string> = {};
  headers.forEach((header, index) => {
    const key = mapHeader(header);
    if (key) record[key] = cells[index] ?? "";
  });
  return record;
}

function parseIntervalClock(raw: unknown): number | undefined {
  const minutes = parseClockToMinutes(raw);
  if (minutes == null) return undefined;
  if (!QUARTER_MINUTES.has(minutes % 60)) return undefined;
  return minutes;
}

function weightedAverage(
  rows: Array<{ value?: number; weight?: number }>
): number | undefined {
  let weighted = 0;
  let total = 0;
  for (const row of rows) {
    if (row.value == null) continue;
    const weight = row.weight && row.weight > 0 ? row.weight : 1;
    weighted += row.value * weight;
    total += weight;
  }
  if (!total) return undefined;
  return Math.round(weighted / total);
}

export function rollupIntervals(intervals: IntervalRow[]): DailyRow[] {
  const byDate = new Map<string, IntervalRow[]>();
  for (const row of intervals) {
    const list = byDate.get(row.date) ?? [];
    list.push(row);
    byDate.set(row.date, list);
  }

  const days: DailyRow[] = [];
  for (const [date, rows] of Array.from(byDate.entries())) {
    const sales = rows.reduce((sum, row) => sum + (row.sales ?? 0), 0);
    const trans = rows.reduce((sum, row) => sum + (row.trans ?? 0), 0);
    const labor = rows.reduce((sum, row) => sum + (row.labor ?? 0), 0);
    const hours = rows.reduce((sum, row) => sum + (row.hours ?? 0), 0);
    const weightOf = (row: IntervalRow) => row.cars ?? row.trans;
    const part = (daypart: Daypart) => rows.filter((row) => row.daypart === daypart);

    days.push({
      date,
      dayOfWeek: rows[0]?.dayOfWeek || weekdayFromIso(date),
      status: "Open",
      kind: "day",
      origin: "interval",
      salesActual: sales || undefined,
      transTy: trans || undefined,
      laborActual: labor || undefined,
      actualHours: hours || undefined,
      dtSosTotalSec: weightedAverage(rows.map((row) => ({ value: row.sosSec, weight: weightOf(row) }))),
      dtSosBreakfastSec: weightedAverage(
        part("breakfast").map((row) => ({ value: row.sosSec, weight: weightOf(row) }))
      ),
      dtSosLunchSec: weightedAverage(
        part("lunch").map((row) => ({ value: row.sosSec, weight: weightOf(row) }))
      ),
      dtSosAfternoonSec: weightedAverage(
        part("afternoon").map((row) => ({ value: row.sosSec, weight: weightOf(row) }))
      ),
      dtSosDinnerSec: weightedAverage(
        part("dinner").map((row) => ({ value: row.sosSec, weight: weightOf(row) }))
      ),
    });
  }
  return days;
}

export function daypartSubtotals(intervals: IntervalRow[]) {
  const parts: Daypart[] = ["breakfast", "lunch", "afternoon", "dinner"];
  return parts.map((daypart) => {
    const rows = intervals.filter((row) => row.daypart === daypart);
    const sales = rows.reduce((sum, row) => sum + (row.sales ?? 0), 0);
    const trans = rows.reduce((sum, row) => sum + (row.trans ?? 0), 0);
    const cars = rows.reduce((sum, row) => sum + (row.cars ?? 0), 0);
    const sosSec = weightedAverage(
      rows.map((row) => ({ value: row.sosSec, weight: row.cars ?? row.trans }))
    );
    return { daypart, sales, trans, cars, sosSec, intervals: rows.length };
  });
}

function parseCsvIntervals(text: string): IntervalRow[] {
  const rows = parseCsvRows(text);
  const headerAt = headerRowIndex(rows);
  if (headerAt < 0) return [];

  const headerText = rows.slice(0, headerAt + 1).flat().join(" ");
  const fallbackDate = extractReportDate(text) ?? extractReportDate(headerText);
  const fallbackDay = weekdayFromText(text) ?? (fallbackDate ? weekdayFromIso(fallbackDate) : "");
  const headers = rows[headerAt];
  const intervals: IntervalRow[] = [];

  for (const cells of rows.slice(headerAt + 1)) {
    const record = toRecord(headers, cells);
    const date = parseDateToken(record.date) ?? fallbackDate;
    const startMin = parseIntervalClock(record.time);
    if (!date || startMin == null) continue;
    intervals.push({
      date,
      dayOfWeek: record.dayOfWeek || fallbackDay || weekdayFromIso(date),
      startMin,
      label: minutesToLabel(startMin),
      daypart: daypartFromMinutes(startMin),
      sales: parseNumber(record.sales),
      trans: parseNumber(record.trans),
      cars: parseNumber(record.cars),
      sosSec: parseDurationSeconds(record.sos),
      orderSec: parseDurationSeconds(record.order),
      windowSec: parseDurationSeconds(record.window),
      labor: parseNumber(record.labor),
      hours: parseNumber(record.hours),
    });
  }
  return intervals;
}

function parseTextIntervals(text: string): IntervalRow[] {
  const fallbackDate = extractReportDate(text);
  const fallbackDay = weekdayFromText(text) ?? (fallbackDate ? weekdayFromIso(fallbackDate) : "");
  if (!fallbackDate && !/date/i.test(text)) {
    // still allow per-row dates
  }

  const intervals: IntervalRow[] = [];
  for (const raw of text.split(/\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const dateInRow =
      parseDateToken(line.match(/\b(\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/)?.[1] ?? "") ??
      fallbackDate;
    const clockMatch = line.match(
      /(\d{1,2}:\d{2}(?::\d{2})?\s*(?:[AaPp][Mm])?(?:\s*(?:-|–|—|\bto\b)\s*\d{1,2}:\d{2}(?:\s*[AaPp][Mm])?)?)/
    );
    if (!clockMatch || !isQuarterClock(clockMatch[1])) continue;
    const startMin = parseIntervalClock(clockMatch[1]);
    if (startMin == null || !dateInRow) continue;

    const after = line.slice(line.indexOf(clockMatch[1]) + clockMatch[1].length);
    const money = after.match(/\$?\d{1,3}(?:,\d{3})*(?:\.\d{2})/);
    const numbers = Array.from(after.matchAll(/\b\d+(?:\.\d+)?\b/g)).map((m) => Number(m[0]));
    const duration = after.match(/\b\d{1,2}:\d{2}(?::\d{2})?\b/);
    const sales = money ? parseNumber(money[0]) : numbers.find((n) => n >= 20);
    const trans = numbers.find((n) => n !== sales && n > 0 && n < 400 && Number.isInteger(n));
    const cars = numbers.find(
      (n) => n !== sales && n !== trans && n > 0 && n < 400 && Number.isInteger(n)
    );

    intervals.push({
      date: dateInRow,
      dayOfWeek: fallbackDay || weekdayFromIso(dateInRow),
      startMin,
      label: minutesToLabel(startMin),
      daypart: daypartFromMinutes(startMin),
      sales,
      trans,
      cars,
      sosSec: duration ? parseDurationSeconds(duration[0]) : undefined,
    });
  }
  return intervals;
}

export function parseIntervalText(text: string, source: "csv" | "pdf" = "csv"): ParseResult {
  const result = emptyParseResult(source);
  if (!looksLikeIntervalReport(text)) return result;

  const fromCsv = text.includes(",") ? parseCsvIntervals(text) : [];
  const intervals = fromCsv.length ? fromCsv : parseTextIntervals(text);
  if (!intervals.length) {
    result.warnings.push({ message: "Found a 15-minute report title, but no interval rows could be read." });
    return result;
  }

  result.intervals = intervals;
  result.days = rollupIntervals(intervals);
  result.kinds = ["interval"];
  return result;
}

export const INTERVAL_CSV_TEMPLATE = `15 Minute Report
Business Date: Friday, June 12, 2026
Time,Sales,Trans,SOS,Cars
6:00 AM,245,18,4:20,16
6:15 AM,260,19,4:28,17
10:30 AM,720,48,5:40,44
14:00,410,27,6:06,24
17:00,390,24,11:51,22
`;
