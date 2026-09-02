import type { Session } from "../types";
import { TARGET_CPH } from "../types";

const STORAGE_KEY = "dtp_sessions";

interface LegacyCar {
  arrivedAt?: number | null;
  departedAt?: number | null;
}

interface LegacySession {
  id?: string;
  daypart?: Session["daypart"];
  laneConfig?: Session["laneConfig"];
  note?: string;
  targetCph?: number;
  startedAt?: number;
  endedAt?: number | null;
  cars?: LegacyCar[];
  departures?: number[];
  flags?: Session["flags"];
}

function migrateSession(raw: LegacySession): Session | null {
  if (!raw || typeof raw.id !== "string" || typeof raw.startedAt !== "number") {
    return null;
  }

  let departures = Array.isArray(raw.departures) ? raw.departures.filter((n) => typeof n === "number") : [];
  if (departures.length === 0 && Array.isArray(raw.cars)) {
    departures = raw.cars
      .map((c) => c.departedAt)
      .filter((n): n is number => typeof n === "number")
      .sort((a, b) => a - b);
  }

  return {
    id: raw.id,
    daypart: raw.daypart ?? "lunch",
    laneConfig: raw.laneConfig ?? "double",
    note: raw.note ?? "",
    targetCph: raw.targetCph && raw.targetCph > 0 ? raw.targetCph : TARGET_CPH,
    startedAt: raw.startedAt,
    endedAt: raw.endedAt ?? null,
    departures,
    flags: Array.isArray(raw.flags) ? raw.flags : [],
  };
}

export function loadSessions(): Session[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LegacySession[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(migrateSession).filter((s): s is Session => s != null);
  } catch {
    return [];
  }
}

export function saveSessions(sessions: Session[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export function getActiveSession(sessions: Session[]): Session | null {
  return sessions.find((s) => s.endedAt === null) ?? null;
}

export function upsertSession(sessions: Session[], session: Session): Session[] {
  const index = sessions.findIndex((s) => s.id === session.id);
  if (index === -1) return [session, ...sessions];
  const next = [...sessions];
  next[index] = session;
  return next;
}

export function deleteSession(sessions: Session[], id: string): Session[] {
  return sessions.filter((s) => s.id !== id);
}

export function getSessionById(sessions: Session[], id: string): Session | null {
  return sessions.find((s) => s.id === id) ?? null;
}
