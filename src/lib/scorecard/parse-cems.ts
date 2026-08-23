import { parseCsvRows, normalizeHeader } from "./csv-rows";
import { emptyParseResult, type DailyRow, type ParseResult } from "./types";
import {
  extractDateRange,
  extractReportDate,
  normalizeScore,
  parseDateToken,
  weekdayFromIso,
} from "./values";

const ATTR_ALIASES: Array<{ key: keyof DailyRow; patterns: RegExp[] }> = [
  { key: "osat", patterns: [/overall\s*satisfaction/, /\bosat\b/, /overall\s*score/, /^overall$/] },
  { key: "osatAccuracy", patterns: [/accuracy/] },
  { key: "osatClean", patterns: [/clean(?:liness)?/] },
  { key: "osatTaste", patterns: [/taste/] },
  { key: "osatTemp", patterns: [/temp(?:erature)?/] },
  { key: "osatFast", patterns: [/\bfast\b/, /speed/, /fast\s*friendly/] },
  { key: "osatCourteous", patterns: [/courteous/, /courtesy/, /friendly/] },
  { key: "osatPortion", patterns: [/portion/] },
];

const HEADER_ALIASES: Record<string, keyof DailyRow> = {
  date: "date",
  surveydate: "date",
  reportdate: "date",
  osat: "osat",
  overallsatisfaction: "osat",
  overall: "osat",
  osataccuracy: "osatAccuracy",
  accuracy: "osatAccuracy",
  osatclean: "osatClean",
  clean: "osatClean",
  cleanliness: "osatClean",
  osattaste: "osatTaste",
  taste: "osatTaste",
  osattemp: "osatTemp",
  temp: "osatTemp",
  temperature: "osatTemp",
  osatfast: "osatFast",
  fast: "osatFast",
  speed: "osatFast",
  osatcourteous: "osatCourteous",
  courteous: "osatCourteous",
  courtesy: "osatCourteous",
  osatportionsize: "osatPortion",
  osatportion: "osatPortion",
  portion: "osatPortion",
  portionsize: "osatPortion",
};

export function looksLikeCemsReport(text: string): boolean {
  if (/\bcems\b|customer\s+experience(?:\s+measurement)?/i.test(text)) return true;
  if (/overall\s+satisfaction/i.test(text)) return true;
  const attrs = ["accuracy", "clean", "taste", "temp", "fast", "courteous", "portion"];
  const hits = attrs.filter((name) => new RegExp(`\\b${name}\\b`, "i").test(text)).length;
  const head = text.slice(0, 1800);
  if (hits >= 4 && /\bosat\b|satisfaction/i.test(text) && !/sales\s*l[y:]|sales\s*actual/i.test(head)) {
    return true;
  }
  const rows = parseCsvRows(text);
  const header = rows[0]?.map(normalizeHeader) ?? [];
  const hasOsat = header.some((h) => h === "osat" || h === "overallsatisfaction" || h === "overall");
  const attrCols = header.filter((h) =>
    /accuracy|clean|taste|temp|fast|courteous|portion/.test(h)
  ).length;
  return hasOsat && attrCols >= 3 && !header.includes("salesactual");
}

function mapHeader(header: string): keyof DailyRow | undefined {
  return HEADER_ALIASES[normalizeHeader(header)];
}

function matchAttr(label: string): keyof DailyRow | undefined {
  const lowered = label.toLowerCase().replace(/[^a-z\s]/g, " ").trim();
  for (const attr of ATTR_ALIASES) {
    if (attr.patterns.some((re) => re.test(lowered))) return attr.key;
  }
  return undefined;
}

function applyScores(row: DailyRow, scores: Partial<DailyRow>) {
  for (const [key, value] of Object.entries(scores) as Array<[keyof DailyRow, DailyRow[keyof DailyRow]]>) {
    if (value != null) (row as unknown as Record<string, unknown>)[key as string] = value;
  }
}

function cemsDay(date: string, scores: Partial<DailyRow>): DailyRow {
  return {
    date,
    dayOfWeek: weekdayFromIso(date),
    status: "Open",
    kind: "day",
    origin: "cems",
    ...scores,
  };
}

function parseCemsCsv(text: string): DailyRow[] {
  const rows = parseCsvRows(text);
  const headerAt = rows.findIndex((row) => row.map(mapHeader).filter(Boolean).length >= 2);
  if (headerAt < 0) return [];
  const headers = rows[headerAt];
  const mapped = headers.map(mapHeader);
  const fallbackDate = extractReportDate(text);
  const days: DailyRow[] = [];

  const isAttributeTable =
    mapped.includes("osat") === false &&
    headers.some((h) => /attribute|metric|category|question/i.test(h)) &&
    headers.some((h) => /score|value|result|percent/i.test(h));

  if (isAttributeTable) {
    const scores: Partial<DailyRow> = {};
    for (const cells of rows.slice(headerAt + 1)) {
      const label = cells[0] ?? "";
      const key = matchAttr(label);
      const score = normalizeScore(cells[1] ?? cells[2]);
      if (key && score != null) (scores as Record<string, number>)[key] = score;
    }
    const date = fallbackDate;
    if (date && Object.keys(scores).length) days.push(cemsDay(date, scores));
    return days;
  }

  for (const cells of rows.slice(headerAt + 1)) {
    const scores: Partial<DailyRow> = {};
    let date = fallbackDate;
    headers.forEach((header, index) => {
      const key = mapHeader(header);
      if (!key) return;
      if (key === "date") {
        date = parseDateToken(cells[index]) ?? date;
        return;
      }
      const score = normalizeScore(cells[index]);
      if (score != null) (scores as Record<string, number>)[key] = score;
    });
    if (!date || !Object.keys(scores).length) continue;
    days.push(cemsDay(date, scores));
  }
  return days;
}

function parseCemsLabeled(text: string): Partial<DailyRow> {
  const scores: Partial<DailyRow> = {};
  const lines = text.split(/\n/).map((line) => line.trim()).filter(Boolean);
  for (const line of lines) {
    for (const attr of ATTR_ALIASES) {
      const match = line.match(
        new RegExp(`(?:${attr.patterns.map((re) => re.source).join("|")})\\s*[:\\-]?\\s*([0-9.]+%?)`, "i")
      );
      if (match) {
        const score = normalizeScore(match[1]);
        if (score != null) (scores as Record<string, number>)[attr.key] = score;
      }
    }
  }

  if (!Object.keys(scores).length) {
    const blob = text.replace(/\s+/g, " ");
    for (const attr of ATTR_ALIASES) {
      const match = blob.match(
        new RegExp(`(?:${attr.patterns.map((re) => re.source).join("|")})\\s*[:\\-]?\\s*([0-9.]+%?)`, "i")
      );
      if (match) {
        const score = normalizeScore(match[1]);
        if (score != null) (scores as Record<string, number>)[attr.key] = score;
      }
    }
  }
  return scores;
}

export function parseCemsText(text: string, source: "csv" | "pdf" = "csv"): ParseResult {
  const result = emptyParseResult(source);
  if (!looksLikeCemsReport(text)) return result;

  const fromCsv = text.includes(",") ? parseCemsCsv(text) : [];
  let days = fromCsv;
  if (!days.length) {
    const scores = parseCemsLabeled(text);
    const range = extractDateRange(text);
    const date = extractReportDate(text) ?? range?.end ?? range?.start;
    if (date && Object.keys(scores).length) {
      days = [cemsDay(date, scores)];
    }
  }

  if (!days.length) {
    result.warnings.push({ message: "Found a CEMS / guest-experience report, but no OSAT scores could be read." });
    return result;
  }

  // Period totals: keep one representative day (report date / range end).
  result.days = days.map((day) => {
    const next = { ...day, origin: "cems" as const };
    applyScores(next, day);
    return next;
  });
  result.kinds = ["cems"];
  return result;
}

export const CEMS_CSV_TEMPLATE = `CEMS Report
Survey Date: May 25, 2026
Date,OSAT,Accuracy,Clean,Taste,Temp,Fast,Courteous,Portion Size
2026-05-25,69.4,94,86.7,82.6,54.2,79.9,69.6,
`;
