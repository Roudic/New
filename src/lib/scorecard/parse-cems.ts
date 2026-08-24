import { parseCsvRows, normalizeHeader } from "./csv-rows";
import { emptyParseResult, type DailyRow, type ParseResult } from "./types";
import {
  extractDateRange,
  extractReportDate,
  isoDate,
  normalizeScore,
  parseDateToken,
  parseLongDate,
  weekdayFromIso,
} from "./values";

const ATTR_ALIASES: Array<{ key: keyof DailyRow; patterns: RegExp[] }> = [
  { key: "osat", patterns: [/overall\s*satisfaction/, /\bosat\b/, /overall\s*(?:customer\s*)?(?:score|sat)/, /overall\s*guest/, /^overall$/] },
  { key: "osatAccuracy", patterns: [/order\s*accuracy/, /accuracy/] },
  { key: "osatClean", patterns: [/clean(?:liness)?(?:\s*combined)?/, /restaurant\s*clean/] },
  { key: "osatTaste", patterns: [/food\s*taste/, /taste/] },
  { key: "osatTemp", patterns: [/food\s*temp(?:erature)?/, /temp(?:erature)?/] },
  { key: "osatFast", patterns: [/speed\s*of\s*service/, /fast\s*(?:and|&)?\s*friendly/, /\bfast\b/] },
  { key: "osatCourteous", patterns: [/attentive(?:\s*(?:and|&)?\s*courteous)?/, /order\s*taking/, /courteous/, /courtesy/] },
  { key: "osatPortion", patterns: [/portion(?:\s*size)?/] },
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
  orderaccuracy: "osatAccuracy",
  osatclean: "osatClean",
  clean: "osatClean",
  cleanliness: "osatClean",
  cleanlinesscombined: "osatClean",
  osattaste: "osatTaste",
  taste: "osatTaste",
  foodtaste: "osatTaste",
  osattemp: "osatTemp",
  temp: "osatTemp",
  temperature: "osatTemp",
  foodtemperature: "osatTemp",
  osatfast: "osatFast",
  fast: "osatFast",
  speed: "osatFast",
  speedofservice: "osatFast",
  osatcourteous: "osatCourteous",
  courteous: "osatCourteous",
  courtesy: "osatCourteous",
  attentivecourteous: "osatCourteous",
  ordertaking: "osatCourteous",
  osatportionsize: "osatPortion",
  osatportion: "osatPortion",
  portion: "osatPortion",
  portionsize: "osatPortion",
};

const MONTH_INDEX: Record<string, number> = {
  january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3, april: 4, apr: 4,
  may: 5, june: 6, jun: 6, july: 7, jul: 7, august: 8, aug: 8,
  september: 9, sep: 9, sept: 9, october: 10, oct: 10, november: 11, nov: 11, december: 12, dec: 12,
};

export function looksLikeCemsReport(text: string, filename = ""): boolean {
  const stem = filename.replace(/\.[^.]+$/, "");
  if (/\b(cems|cem)\b|osat|guest[-_\s]?exp|customer[-_\s]?exp/i.test(stem)) return true;
  if (/\bcems\b|\bcem\b|customer\s+experience(?:\s+(?:measurement|monitor|system))?/i.test(text)) {
    return true;
  }
  if (/overall\s+satisfaction|top\s*box/i.test(text)) return true;
  const attrs = ["accuracy", "clean", "taste", "temp", "fast", "courteous", "portion"];
  const hits = attrs.filter((name) => new RegExp(`\\b${name}\\b`, "i").test(text)).length;
  const head = text.slice(0, 1800);
  if (hits >= 4 && /\bosat\b|satisfaction/i.test(text) && !/sales\s*l[y:]|sales\s*actual/i.test(head)) {
    return true;
  }
  const rows = parseCsvRows(text);
  const header = rows[0]?.map(normalizeHeader) ?? [];
  const hasOsat = header.some((h) => h === "osat" || h === "overallsatisfaction" || h === "overall");
  const attrCols = header.filter((h) => /accuracy|clean|taste|temp|fast|courteous|portion/.test(h)).length;
  return hasOsat && attrCols >= 3 && !header.includes("salesactual");
}

function mapHeader(header: string): keyof DailyRow | undefined {
  return HEADER_ALIASES[normalizeHeader(header)];
}

function matchAttr(label: string): keyof DailyRow | undefined {
  const lowered = label.toLowerCase().replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
  if (!lowered || /^(goal|target|sample|respondents|surveys|n)$/i.test(lowered)) return undefined;
  for (const attr of ATTR_ALIASES) {
    if (attr.patterns.some((re) => re.test(lowered))) return attr.key;
  }
  return undefined;
}

function clampCemsScore(value: number | undefined): number | undefined {
  if (value == null || !Number.isFinite(value)) return undefined;
  if (value < 15 || value > 100) return undefined;
  return value;
}

function scoreFromToken(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  return clampCemsScore(normalizeScore(raw));
}

function numbersOnLine(line: string): Array<{ raw: string; index: number }> {
  return Array.from(line.matchAll(/[0-9]{1,5}(?:\.[0-9]+)?%?/g)).map((match) => ({
    raw: match[0],
    index: match.index ?? 0,
  }));
}

function pickScoreFromLine(line: string): number | undefined {
  const cleaned = line.replace(/\b(?:n\s*=\s*|sample(?:\s*size)?\s*[:\-]?\s*)\d+/gi, "");
  const goalAt = cleaned.search(/\b(?:goal|target)\b/i);
  const usable = goalAt >= 0 ? cleaned.slice(0, goalAt) : cleaned;
  const tokens = numbersOnLine(usable);
  const withPct = tokens.find((token) => token.raw.includes("%"));
  if (withPct) return scoreFromToken(withPct.raw);
  for (const token of tokens) {
    const score = scoreFromToken(token.raw);
    if (score != null) return score;
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

function lastDayOfMonth(year: number, month: number): string {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return isoDate(year, month, last);
}

export function extractCemsDate(text: string): string | undefined {
  const labeled = text.match(
    /(?:survey\s+date|report(?:ing)?\s+date|week\s+ending|period\s+ending|ending|as\s+of|through|thru)\s*[:\-]?\s*([^\n]+)/i
  );
  if (labeled) {
    const chunk = labeled[1].trim().split(/\s{2,}|\s+[A-Z][a-z]+(?:\s+[A-Z])?$/)[0] ?? labeled[1];
    const parsed = parseDateToken(chunk) ?? parseLongDate(chunk);
    if (parsed) return parsed;
  }
  const range = extractDateRange(text);
  if (range?.end) return range.end;
  const fromExtract = extractReportDate(text);
  if (fromExtract) return fromExtract;
  const monthYear = text.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.?\s+(20\d{2})\b/i
  );
  if (monthYear) {
    const month = MONTH_INDEX[monthYear[1].toLowerCase().replace(".", "")];
    const year = Number(monthYear[2]);
    if (month && year) return lastDayOfMonth(year, month);
  }
  return undefined;
}

function extractCemsLocation(text: string): string | undefined {
  const match = text.match(/chick-?\s*fil-?\s*a\s+([A-Za-z][A-Za-z .'-]{1,40})/i);
  if (!match) return undefined;
  return `Chick-fil-A ${match[1].split(",")[0].replace(/\s+/g, " ").trim()}`;
}

function looksLikeCemsCsvTable(text: string): boolean {
  const rows = parseCsvRows(text);
  return rows.some((row) => row.map(mapHeader).filter(Boolean).length >= 3);
}

function parseCemsCsv(text: string): DailyRow[] {
  const rows = parseCsvRows(text);
  const headerAt = rows.findIndex((row) => row.map(mapHeader).filter(Boolean).length >= 2);
  if (headerAt < 0) return [];
  const headers = rows[headerAt];
  const mapped = headers.map(mapHeader);
  const fallbackDate = extractCemsDate(text);
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
      const score = scoreFromToken(cells[1] ?? cells[2]);
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
      const score = scoreFromToken(cells[index]);
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

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const key = matchAttr(line);
    if (!key || scores[key] != null) continue;
    const sameLine = pickScoreFromLine(line);
    if (sameLine != null) {
      (scores as Record<string, number>)[key] = sameLine;
      continue;
    }
    const next = lines[i + 1];
    if (next && !matchAttr(next)) {
      const nextScore = pickScoreFromLine(next);
      if (nextScore != null) (scores as Record<string, number>)[key] = nextScore;
    }
  }

  if (Object.keys(scores).length >= 2) return scores;

  const blob = text.replace(/\s+/g, " ");
  for (const attr of ATTR_ALIASES) {
    if (scores[attr.key] != null) continue;
    const match = blob.match(
      new RegExp(`(?:${attr.patterns.map((re) => re.source).join("|")})\\s*[:\\-]?\\s*([0-9]{1,5}(?:\\.[0-9]+)?%?)`, "i")
    );
    if (match) {
      const score = scoreFromToken(match[1]);
      if (score != null) (scores as Record<string, number>)[attr.key] = score;
    }
  }
  return scores;
}

function parseCemsGlued(text: string): Partial<DailyRow> {
  const scores: Partial<DailyRow> = {};
  const compact = text.replace(/\r/g, "\n");
  for (const attr of ATTR_ALIASES) {
    if (scores[attr.key] != null) continue;
    const match = compact.match(
      new RegExp(`(?:${attr.patterns.map((re) => re.source).join("|")})\\s*[:\\-]?\\s*([0-9]{1,5}(?:\\.[0-9]+)?%?)`, "i")
    );
    if (!match) continue;
    const score = scoreFromToken(match[1]);
    if (score != null) (scores as Record<string, number>)[attr.key] = score;
  }
  return scores;
}

export function parseCemsText(text: string, source: "csv" | "pdf" = "csv", filename = ""): ParseResult {
  const result = emptyParseResult(source);
  if (!looksLikeCemsReport(text, filename)) return result;

  const csvDays = source === "csv" || looksLikeCemsCsvTable(text) ? parseCemsCsv(text) : [];
  const labeled = parseCemsLabeled(text);
  const glued = Object.keys(labeled).length >= 2 ? labeled : { ...parseCemsGlued(text), ...labeled };
  const date = extractCemsDate(text);
  const labeledDays = date && Object.keys(glued).length ? [cemsDay(date, glued)] : [];

  let days = source === "pdf" ? labeledDays : csvDays;
  if (!days.length) days = labeledDays.length ? labeledDays : csvDays;

  if (!days.length) {
    result.warnings.push({
      message:
        "Found a CEMS / guest-experience PDF, but no OSAT scores could be read. Use the original report PDF from email or Pathway — not a photo.",
    });
    return result;
  }

  result.days = days.map((day) => {
    const next = { ...day, origin: "cems" as const };
    applyScores(next, day);
    return next;
  });
  result.kinds = ["cems"];
  result.location = extractCemsLocation(text);
  return result;
}

export const CEMS_CSV_TEMPLATE = `CEMS Report
Survey Date: May 25, 2026
Date,OSAT,Accuracy,Clean,Taste,Temp,Fast,Courteous,Portion Size
2026-05-25,69.4,94,86.7,82.6,54.2,79.9,69.6,
`;

/** Layout we expect after pdf-parse extracts a store CEMS / CEM report. */
export const CEMS_PDF_SAMPLE = `Customer Experience Monitor
Chick-fil-A Hueytown, AL
Reporting Period: May 1, 2026 – May 31, 2026
Week Ending: May 25, 2026

Overall Satisfaction
69.4%
Goal 85%
n=214

Order Accuracy    94.0    90    142
Cleanliness Combined    86.7
Food Taste    82.6
Food Temperature    54.2
Speed of Service    79.9
Attentive/Courteous    69.6
Portion Size    88.0
`;
