import type { Daypart } from "./types";

const NA_TOKENS = new Set(["", "-", "—", "#n/a", "#na", "n/a", "na", "null", "undefined"]);

export function isBlank(value: unknown): boolean {
  if (value == null) return true;
  return NA_TOKENS.has(String(value).trim().toLowerCase());
}

export function parseNumber(raw: unknown): number | undefined {
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? raw : undefined;
  }
  if (isBlank(raw)) return undefined;
  let text = String(raw).trim();
  if (!text) return undefined;

  const negative = /^\(.*\)$/.test(text) || text.startsWith("−");
  text = text.replace(/[()]/g, "").replace(/^−/, "-");
  text = text.replace(/[$£€,\s]/g, "");
  if (text.endsWith("%")) text = text.slice(0, -1);
  if (text === "" || text === "-" || text === "+") return undefined;

  const value = Number(text);
  if (!Number.isFinite(value)) return undefined;
  return negative && value > 0 ? -value : value;
}

/** Normalize workbook percents. 0.244 → 24.4, 8500 → 85, 24.39 stays 24.39. */
export function normalizePercent(raw: unknown, opts?: { excelGoal?: boolean }): number | undefined {
  const value = parseNumber(raw);
  if (value == null) return undefined;
  const abs = Math.abs(value);
  if (opts?.excelGoal && abs >= 100) return value / 100;
  if (abs > 0 && abs <= 1) return value * 100;
  if (abs >= 200 && abs <= 20000) return value / 100;
  return value;
}

/** OSAT lives as 69.4, 0.694, or a broken Excel 8500%. */
export function normalizeScore(raw: unknown): number | undefined {
  const value = parseNumber(raw);
  if (value == null) return undefined;
  const abs = Math.abs(value);
  if (abs > 0 && abs <= 1) return value * 100;
  if (abs >= 200) return value / 100;
  return value;
}

/**
 * Convert SOS cells to seconds.
 * Accepts 7:25, 0:07:25, 7.733 minutes, or 445 seconds.
 */
export function parseDurationSeconds(raw: unknown): number | undefined {
  if (typeof raw === "number") {
    if (!Number.isFinite(raw) || raw < 0) return undefined;
    if (raw === 0) return 0;
    if (Number.isInteger(raw) && raw >= 60 && raw <= 6 * 3600) return raw;
    if (raw < 90) return Math.round(raw * 60);
    return Math.round(raw);
  }
  if (isBlank(raw)) return undefined;
  const text = String(raw).trim();
  if (/^\d{1,2}:\d{2}(?::\d{2})?$/.test(text)) {
    const parts = text.split(":").map((p) => Number(p));
    if (parts.some((n) => !Number.isFinite(n))) return undefined;
    if (parts.length === 3) {
      const [hours, minutes, seconds] = parts;
      if (hours === 0) return minutes * 60 + seconds;
      if (hours <= 5 && minutes <= 59) return hours * 3600 + minutes * 60 + seconds;
      return hours * 60 + minutes;
    }
    const [minutes, seconds] = parts;
    return minutes * 60 + seconds;
  }
  const numeric = parseNumber(text);
  if (numeric == null) return undefined;
  return parseDurationSeconds(numeric);
}

export function secondsToClock(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return "—";
  const abs = Math.abs(Math.round(seconds));
  const minutes = Math.floor(abs / 60);
  const secs = abs % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function parseDateToken(raw: unknown): string | undefined {
  if (isBlank(raw)) return undefined;
  const text = String(raw).trim();
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) return isoDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  const us = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (us) {
    const month = Number(us[1]);
    const day = Number(us[2]);
    let year = Number(us[3]);
    if (year < 100) year += 2000;
    return isoDate(year, month, day);
  }
  if (/^\d{1,2}[/-]\d{1,2}$/.test(text)) return undefined;
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return isoDate(parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate());
  }
  return undefined;
}

export function weekdayFromIso(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return names[new Date(Date.UTC(year, month - 1, day)).getUTCDay()] ?? "";
}

export function monthLabel(month: number): string {
  return [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ][month - 1] ?? "";
}

export function nearlyEqual(a: number, b: number, tolerance = 1.5): boolean {
  return Math.abs(a - b) <= tolerance;
}

export function parseClockToMinutes(raw: unknown): number | undefined {
  if (typeof raw === "number") {
    if (!Number.isFinite(raw) || raw < 0) return undefined;
    if (raw > 0 && raw < 1) return Math.round(raw * 1440) % 1440;
    if (Number.isInteger(raw) && raw <= 2359) {
      const hours = Math.floor(raw / 100);
      const minutes = raw % 100;
      if (hours < 24 && minutes < 60) return hours * 60 + minutes;
    }
    return undefined;
  }
  if (isBlank(raw)) return undefined;
  const start = String(raw)
    .trim()
    .split(/\s*(?:-|–|—|\bto\b)\s*/i)[0]
    .trim();
  const match = start.match(/^(\d{1,2})(?::(\d{2}))?(?::\d{2})?\s*([AaPp][Mm])?$/);
  if (!match) return undefined;
  let hours = Number(match[1]);
  const minutes = Number(match[2] ?? 0);
  const ampm = match[3]?.toLowerCase();
  if (minutes > 59) return undefined;
  if (ampm) {
    if (hours === 12) hours = 0;
    if (ampm.startsWith("p")) hours += 12;
  }
  if (hours > 23) return undefined;
  return hours * 60 + minutes;
}

export function minutesToLabel(startMin: number): string {
  const hours24 = Math.floor(((startMin % 1440) + 1440) % 1440 / 60);
  const minutes = ((startMin % 1440) + 1440) % 1440 % 60;
  const suffix = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;
  return `${hours12}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

export function daypartFromMinutes(startMin: number): Daypart {
  if (startMin < 10 * 60 + 30) return "breakfast";
  if (startMin < 14 * 60) return "lunch";
  if (startMin < 17 * 60) return "afternoon";
  return "dinner";
}

export function extractReportDate(text: string): string | undefined {
  const labeled = text.match(
    /(?:business\s+date|report\s+date|operating\s+date|for(?:\s+the\s+day)?|date)\s*[:\-]\s*([^\n,]+(?:,[^\n]+)?)/i
  );
  if (labeled) {
    const parsed = parseDateToken(labeled[1].trim()) ?? parseLongDate(labeled[1].trim());
    if (parsed) return parsed;
  }
  const long = text.match(
    /(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/i
  );
  if (long) {
    const parsed = parseLongDate(long[0]);
    if (parsed) return parsed;
  }
  const us = text.match(/\b(\d{1,2}\/\d{1,2}\/\d{2,4})\b/);
  if (us) return parseDateToken(us[1]);
  const iso = text.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (iso) return iso[1];
  return undefined;
}

export function parseLongDate(text: string): string | undefined {
  const cleaned = text.replace(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+/i, "");
  const fromToken = parseDateToken(cleaned);
  if (fromToken) return fromToken;
  const parsed = new Date(cleaned);
  if (!Number.isNaN(parsed.getTime())) {
    return isoDate(parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate());
  }
  return undefined;
}

export function weekdayFromText(text: string): string | undefined {
  const match = text.match(/\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/i);
  if (!match) return undefined;
  return match[1][0].toUpperCase() + match[1].slice(1).toLowerCase();
}

export function inferYear(text: string, fallback = 2026): number {
  const years = Array.from(text.matchAll(/\b(202[4-9]|203\d)\b/g)).map((m) => Number(m[1]));
  return years[0] ?? fallback;
}

export function parseShortDate(raw: string, year: number): string | undefined {
  const md = raw.trim().match(/^(\d{1,2})[/-](\d{1,2})$/);
  if (md) return isoDate(year, Number(md[1]), Number(md[2]));
  return parseDateToken(raw);
}

export function extractDateRange(text: string): { start: string; end: string } | undefined {
  const range = text.match(
    /(?:period|range|between|from)\s*[:\-]?\s*([A-Za-z0-9,/\- ]+?)\s*(?:–|—|-|to|through)\s*([A-Za-z0-9,/\- ]+)/i
  );
  if (!range) return undefined;
  const year = inferYear(text);
  const start = parseDateToken(range[1]) ?? parseLongDate(range[1]) ?? parseShortDate(range[1], year);
  const end = parseDateToken(range[2]) ?? parseLongDate(range[2]) ?? parseShortDate(range[2], year);
  if (start && end) return { start, end };
  return undefined;
}
