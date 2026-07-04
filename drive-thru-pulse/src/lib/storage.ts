import type { Session } from "../types";

const STORAGE_KEY = "dtp_sessions";

export function loadSessions(): Session[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Session[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSessions(sessions: Session[]): void {
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
