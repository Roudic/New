"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/context/AppContext";
import {
  applyDraft,
  createL10Session,
  mostRecentPrevious,
} from "@/lib/l10/session";
import type { CreateL10Input, L10Session, L10SessionDraft } from "@/lib/l10/types";

const LOCAL_KEY = "jolt-l10-sessions";
const AUTOSAVE_DELAY_MS = 700;

export type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

function loadLocal(): L10Session[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as L10Session[]) : [];
  } catch {
    return [];
  }
}

function saveLocal(sessions: L10Session[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(sessions));
  } catch {
    // Private browsing can reject writes; autosave will retry on next change.
  }
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function useL10() {
  const { storageMode, isLoggedIn, hydrated } = useApp();
  const isCloud = storageMode === "cloud" && isLoggedIn;

  const [sessions, setSessions] = useState<L10Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pendingSaves = useRef(new Map<string, L10Session>());
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionsRef = useRef<L10Session[]>([]);
  sessionsRef.current = sessions;

  const persistLocal = useCallback((next: L10Session[]) => {
    saveLocal(next);
  }, []);

  const flushSaves = useCallback(async () => {
    if (pendingSaves.current.size === 0) return;
    const batch = Array.from(pendingSaves.current.entries());
    pendingSaves.current.clear();
    setSaveState("saving");
    try {
      if (isCloud) {
        await Promise.all(
          batch.map(([id, session]) =>
            api<L10Session>(`/api/l10/${id}`, {
              method: "PATCH",
              body: JSON.stringify(session),
            })
          )
        );
      } else {
        persistLocal(sessionsRef.current);
      }
      setSaveState("saved");
      setLastSavedAt(new Date());
      setError(null);
    } catch (err) {
      for (const [id, session] of batch) {
        if (!pendingSaves.current.has(id)) pendingSaves.current.set(id, session);
      }
      setSaveState("error");
      setError(err instanceof Error ? err.message : "Could not save L10");
    }
  }, [isCloud, persistLocal]);

  const queueSave = useCallback(
    (session: L10Session) => {
      pendingSaves.current.set(session.id, session);
      setSaveState("dirty");
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void flushSaves();
      }, AUTOSAVE_DELAY_MS);
    },
    [flushSaves]
  );

  const refresh = useCallback(async () => {
    if (storageMode === "loading" || !hydrated) return;
    setLoading(true);
    try {
      if (isCloud) {
        const remote = await api<L10Session[]>("/api/l10");
        setSessions(remote);
        persistLocal(remote);
      } else {
        setSessions(loadLocal());
      }
      setError(null);
    } catch (err) {
      setSessions(loadLocal());
      setError(err instanceof Error ? err.message : "Could not load L10 sessions");
    } finally {
      setLoading(false);
    }
  }, [hydrated, isCloud, persistLocal, storageMode]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const createSession = useCallback(
    async (input: CreateL10Input = {}) => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
      await flushSaves();
      if (pendingSaves.current.size > 0) {
        throw new Error("Could not save the current session before creating a new one.");
      }

      const previous =
        input.copyFromPrevious === false
          ? null
          : mostRecentPrevious(sessionsRef.current);
      const local = createL10Session({
        title: input.title,
        scheduledAt: input.scheduledAt,
        location: input.location,
        previous,
      });

      if (isCloud) {
        const created = await api<L10Session>("/api/l10", {
          method: "POST",
          body: JSON.stringify(input),
        });
        setSessions((current) => [created, ...current.filter((s) => s.id !== created.id)]);
        return created;
      }

      setSessions((current) => {
        const next = [local, ...current];
        persistLocal(next);
        return next;
      });
      setSaveState("saved");
      setLastSavedAt(new Date());
      return local;
    },
    [flushSaves, isCloud, persistLocal]
  );

  const updateSession = useCallback(
    (id: string, draft: L10SessionDraft) => {
      let updated: L10Session | null = null;
      setSessions((current) => {
        const next = current.map((session) => {
          if (session.id !== id) return session;
          updated = applyDraft(session, draft);
          return updated;
        });
        if (!isCloud) persistLocal(next);
        return next;
      });
      if (updated) queueSave(updated);
    },
    [isCloud, persistLocal, queueSave]
  );

  const deleteSession = useCallback(
    async (id: string) => {
      pendingSaves.current.delete(id);
      if (isCloud) {
        await api<{ ok: boolean }>(`/api/l10/${id}`, { method: "DELETE" });
      }
      setSessions((current) => {
        const next = current.filter((session) => session.id !== id);
        persistLocal(next);
        return next;
      });
    },
    [isCloud, persistLocal]
  );

  return useMemo(
    () => ({
      sessions,
      loading,
      saveState,
      lastSavedAt,
      error,
      isCloud,
      refresh,
      createSession,
      updateSession,
      deleteSession,
    }),
    [
      createSession,
      deleteSession,
      error,
      isCloud,
      lastSavedAt,
      loading,
      refresh,
      saveState,
      sessions,
      updateSession,
    ]
  );
}
