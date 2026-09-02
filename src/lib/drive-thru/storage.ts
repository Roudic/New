import type { Car, Session } from "./types";

const STORAGE_KEY = "kitchencheck_dt_timer_sessions_v1";

interface LegacySession {
  id: string;
  daypart: Session["daypart"];
  laneConfig: Session["laneConfig"];
  note: string;
  startedAt: number;
  endedAt: number | null;
  cars?: Car[];
  departures?: number[];
  flags?: Session["flags"];
}

function migrateSession(raw: LegacySession): Session | null {
  if (!raw || typeof raw.id !== "string" || typeof raw.startedAt !== "number") {
    return null;
  }

  let cars: Car[] = Array.isArray(raw.cars) ? raw.cars : [];
  if (cars.length === 0 && Array.isArray(raw.departures)) {
    cars = raw.departures.map((ts, i) => ({
      id: `legacy-${raw.id}-${i}`,
      arrivedAt: null,
      departedAt: ts,
    }));
  }

  return {
    id: raw.id,
    daypart: raw.daypart ?? "lunch",
    laneConfig: raw.laneConfig ?? "double",
    note: raw.note ?? "",
    startedAt: raw.startedAt,
    endedAt: raw.endedAt ?? null,
    cars,
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
