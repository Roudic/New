import { parseCsvText } from "./parse-csv";
import { looksLikeCemsReport } from "./parse-cems";
import { looksLikeIntervalReport } from "./parse-interval";
import { looksLikeSosReport } from "./parse-sos";
import { parseWorkbookText } from "./parse-workbook";
import type { ParseResult, ScorecardKind } from "./types";

export function classifyScorecardText(text: string, filename = "upload.txt"): ScorecardKind[] {
  const kinds: ScorecardKind[] = [];
  if (looksLikeIntervalReport(text)) kinds.push("interval");
  if (looksLikeCemsReport(text)) kinds.push("cems");
  if (looksLikeSosReport(text) || /\d{1,2}\/\d{1,2}\s+\d{1,2}:\d{2}/.test(text)) kinds.push("sos");
  if (/datedayopen\/closedsalesly|sales\s*actual|salesactual/i.test(text)) kinds.push("daily");
  if (/\bfood\s*cost\b|\bnet\s*profit\b/i.test(text) && /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|month)\b/i.test(text)) {
    kinds.push("monthly");
  }
  if (/osat\s*goal|labor\s*target|2026 settings|2025 settings/i.test(text)) kinds.push("goals");
  if (!kinds.length && looksLikeCsv(text, filename)) kinds.push("daily");
  return Array.from(new Set(kinds));
}

export function parseScorecardText(text: string, filename = "upload.csv"): ParseResult {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) {
    return parseWorkbookText(text);
  }
  if (lower.endsWith(".csv") || looksLikeCsv(text, filename)) {
    return parseCsvText(text);
  }
  return parseWorkbookText(text);
}

function looksLikeCsv(text: string, filename = ""): boolean {
  if (filename.toLowerCase().endsWith(".csv")) return true;
  const first = text.split(/\n/).find((line) => line.trim()) ?? "";
  return (
    first.includes(",") &&
    /date|sales|labor|osat|time|interval|trans|cems|accuracy|clean|sos|cars/i.test(first + "\n" + text.slice(0, 400))
  );
}

export { parseCsvText } from "./parse-csv";
export { parseWorkbookText } from "./parse-workbook";
export { parseIntervalText, looksLikeIntervalReport } from "./parse-interval";
export { parseCemsText, looksLikeCemsReport } from "./parse-cems";
export { parseSosText, looksLikeSosReport } from "./parse-sos";
