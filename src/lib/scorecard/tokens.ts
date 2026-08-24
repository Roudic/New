export type TokenKind = "money" | "percent" | "duration" | "number";

export interface Token {
  kind: TokenKind;
  raw: string;
  value: number;
}

const MONEY = "\\d{1,3}(?:,\\d{3})*(?:\\.\\d{1,2})?";
const TOKEN_RE = new RegExp(
  `(\\(-?\\$?${MONEY}\\)|-\\$${MONEY}|\\$${MONEY}|-?[\\d,]+(?:\\.\\d+)?%|\\d{1,2}:\\d{2}(?::\\d{2})?|\\d{1,3}(?:,\\d{3})+(?:\\.\\d+)?|-?\\d+\\.\\d+|-?\\d+)`,
  "g"
);

function toNumber(raw: string): number {
  const paren = /^\(.*\)$/.test(raw);
  const text = raw.replace(/[$,()\s]/g, "").replace(/%$/, "");
  const value = Number(text);
  if (!Number.isFinite(value)) return NaN;
  return paren && value > 0 ? -value : value;
}

function durationSeconds(raw: string): number {
  const parts = raw.split(":").map(Number);
  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    if (hours === 0) return minutes * 60 + seconds;
    if (hours <= 5) return hours * 3600 + minutes * 60 + seconds;
    return hours * 60 + minutes;
  }
  return parts[0] * 60 + parts[1];
}

export function tokenize(line: string): Token[] {
  const tokens: Token[] = [];
  const matches = Array.from(line.matchAll(TOKEN_RE));
  for (const match of matches) {
    const raw = match[1];
    if (raw.includes(":") && /^\d{1,2}:\d{2}(?::\d{2})?$/.test(raw)) {
      tokens.push({ kind: "duration", raw, value: durationSeconds(raw) });
      continue;
    }
    if (raw.includes("%")) {
      const value = toNumber(raw);
      if (Number.isFinite(value)) tokens.push({ kind: "percent", raw, value });
      continue;
    }
    if (raw.includes("$") || /^\(.*\)$/.test(raw)) {
      const value = toNumber(raw);
      if (Number.isFinite(value)) tokens.push({ kind: "money", raw, value });
      continue;
    }
    const value = toNumber(raw);
    if (Number.isFinite(value)) tokens.push({ kind: "number", raw, value });
  }
  return tokens;
}

export function moneyish(token: Token | undefined): number | undefined {
  if (!token) return undefined;
  if (token.kind === "duration") return undefined;
  return token.value;
}
