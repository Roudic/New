import { parseCsvText } from "./parse-csv";
import { parseWorkbookText } from "./parse-workbook";
import type { ParseResult } from "./types";

export function parseScorecardText(text: string, filename = "upload.csv"): ParseResult {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".csv") || looksLikeCsv(text)) {
    return parseCsvText(text);
  }
  return parseWorkbookText(text);
}

function looksLikeCsv(text: string): boolean {
  const first = text.split(/\n/).find((line) => line.trim()) ?? "";
  return first.includes(",") && /date|sales|labor|osat/i.test(first);
}

export { parseCsvText } from "./parse-csv";
export { parseWorkbookText } from "./parse-workbook";
