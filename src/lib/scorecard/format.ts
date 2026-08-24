import { secondsToClock } from "./values";

const moneyFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const moneyExactFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const countFmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export function formatMoney(value: number | null | undefined, exact = false): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return (exact && Math.abs(value) < 1000 ? moneyExactFmt : moneyFmt).format(value);
}

export function formatSignedMoney(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const abs = formatMoney(Math.abs(value));
  if (value > 0) return `▲ ${abs}`;
  if (value < 0) return `▼ ${abs}`;
  return abs;
}

export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(digits)}%`;
}

export function formatSignedPercent(value: number | null | undefined, digits = 1): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const abs = `${Math.abs(value).toFixed(digits)}%`;
  if (value > 0) return `▲ ${abs}`;
  if (value < 0) return `▼ ${abs}`;
  return abs;
}

export function formatScore(value: number | null | undefined, digits = 1): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toFixed(digits);
}

export function formatCount(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return countFmt.format(value);
}

export function formatSos(seconds: number | null | undefined): string {
  return secondsToClock(seconds);
}

export function formatKpi(
  value: number | null | undefined,
  unit: "money" | "percent" | "score" | "count" | "time"
): string {
  switch (unit) {
    case "money":
      return formatMoney(value);
    case "percent":
      return formatPercent(value);
    case "score":
      return formatScore(value);
    case "count":
      return formatCount(value);
    case "time":
      return formatSos(value);
    default:
      return "—";
  }
}

export function prettyDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
