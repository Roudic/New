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
