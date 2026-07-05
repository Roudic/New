"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/context/AppContext";
import { generateId } from "@/lib/utils";
import type {
  JournalEntry,
  JournalEntryDraft,
  Notebook,
} from "@/lib/journal-types";

const LOCAL_KEY = "jolt-journal-app";
const AUTOSAVE_DELAY_MS = 700;

export type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

interface LocalJournalState {
  notebooks: Notebook[];
  entries: JournalEntry[];
}

function loadLocal(): LocalJournalState {
  if (typeof window === "undefined") return { notebooks: [], entries: [] };
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return { notebooks: [], entries: [] };
    const parsed = JSON.parse(raw) as Partial<LocalJournalState>;
    return {
      notebooks: parsed.notebooks ?? [],
      entries: parsed.entries ?? [],
    };
  } catch {
    return { notebooks: [], entries: [] };
  }
}

function saveLocal(state: LocalJournalState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(state));
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
  return res.json() as Promise<T>;
}

export function useJournal() {
  const { storageMode, isLoggedIn, hydrated } = useApp();
  const isCloud = storageMode === "cloud" && isLoggedIn;

  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const pendingSaves = useRef(new Map<string, JournalEntryDraft>());
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef<LocalJournalState>({ notebooks: [], entries: [] });
  stateRef.current = { notebooks, entries };

  const refresh = useCallback(async () => {
    if (storageMode === "loading" || !hydrated) return;
    setLoading(true);
    try {
      if (isCloud) {
        const [nbs, ents] = await Promise.all([
          api<Notebook[]>("/api/journal/notebooks"),
          api<JournalEntry[]>("/api/journal/entries"),
        ]);
        setNotebooks(nbs);
        setEntries(ents);
      } else {
        const local = loadLocal();
        setNotebooks(local.notebooks);
        setEntries(local.entries);
      }
    } finally {
      setLoading(false);
    }
  }, [isCloud, storageMode, hydrated]);

  useEffect(() => {
    refresh().catch(console.error);
  }, [refresh]);

  const persistLocal = useCallback(
    (next: Partial<LocalJournalState>) => {
      saveLocal({ ...stateRef.current, ...next });
    },
    []
  );

  const createNotebook = useCallback(
    async (name: string, color: string): Promise<Notebook> => {
      if (isCloud) {
        const notebook = await api<Notebook>("/api/journal/notebooks", {
          method: "POST",
          body: JSON.stringify({ name, color }),
        });
        setNotebooks((prev) => [...prev, notebook]);
        return notebook;
      }
      const now = new Date().toISOString();
      const notebook: Notebook = {
        id: `nb-${generateId()}`,
        name,
        color,
        createdAt: now,
        updatedAt: now,
      };
      setNotebooks((prev) => {
        const next = [...prev, notebook];
        persistLocal({ notebooks: next });
        return next;
      });
      return notebook;
    },
    [isCloud, persistLocal]
  );

  const renameNotebook = useCallback(
    async (id: string, name: string) => {
      if (isCloud) {
        const updated = await api<Notebook>(`/api/journal/notebooks/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ name }),
        });
        setNotebooks((prev) => prev.map((n) => (n.id === id ? updated : n)));
        return;
      }
      setNotebooks((prev) => {
        const next = prev.map((n) => (n.id === id ? { ...n, name } : n));
        persistLocal({ notebooks: next });
        return next;
      });
    },
    [isCloud, persistLocal]
  );

  const deleteNotebook = useCallback(
    async (id: string) => {
      if (isCloud) {
        await api(`/api/journal/notebooks/${id}`, { method: "DELETE" });
        setNotebooks((prev) => prev.filter((n) => n.id !== id));
        setEntries((prev) => prev.filter((e) => e.notebookId !== id));
        return;
      }
      setNotebooks((prev) => {
        const nextNotebooks = prev.filter((n) => n.id !== id);
        const nextEntries = stateRef.current.entries.filter(
          (e) => e.notebookId !== id
        );
        persistLocal({ notebooks: nextNotebooks, entries: nextEntries });
        setEntries(nextEntries);
        return nextNotebooks;
      });
    },
    [isCloud, persistLocal]
  );

  const createEntry = useCallback(
    async (notebookId: string): Promise<JournalEntry> => {
      if (isCloud) {
        const entry = await api<JournalEntry>("/api/journal/entries", {
          method: "POST",
          body: JSON.stringify({ notebookId }),
        });
        setEntries((prev) => [entry, ...prev]);
        return entry;
      }
      const now = new Date().toISOString();
      const entry: JournalEntry = {
        id: `entry-${generateId()}`,
        notebookId,
        title: "",
        content: "",
        tags: [],
        mood: null,
        aiSummary: null,
        pinned: false,
        entryDate: now,
        createdAt: now,
        updatedAt: now,
      };
      setEntries((prev) => {
        const next = [entry, ...prev];
        persistLocal({ entries: next });
        return next;
      });
      return entry;
    },
    [isCloud, persistLocal]
  );

  const flushSaves = useCallback(async () => {
    const pending = new Map(pendingSaves.current);
    pendingSaves.current.clear();
    if (pending.size === 0) return;

    if (!isCloud) {
      persistLocal({});
      setSaveState("saved");
      setLastSavedAt(new Date());
      return;
    }

    setSaveState("saving");
    try {
      await Promise.all(
        Array.from(pending.entries()).map(([id, draft]) =>
          api<JournalEntry>(`/api/journal/entries/${id}`, {
            method: "PATCH",
            body: JSON.stringify(draft),
          })
        )
      );
      setSaveState("saved");
      setLastSavedAt(new Date());
    } catch (error) {
      console.error(error);
      // Re-queue so the next keystroke retries the failed save.
      pending.forEach((draft, id) => {
        const queued = pendingSaves.current.get(id);
        pendingSaves.current.set(id, { ...draft, ...queued });
      });
      setSaveState("error");
    }
  }, [isCloud, persistLocal]);

  const updateEntry = useCallback(
    (id: string, draft: JournalEntryDraft) => {
      setEntries((prev) => {
        const next = prev.map((e) =>
          e.id === id
            ? {
                ...e,
                ...draft,
                tags: draft.tags ?? e.tags,
                updatedAt: new Date().toISOString(),
              }
            : e
        );
        if (!isCloud) {
          saveLocal({ notebooks: stateRef.current.notebooks, entries: next });
        }
        return next;
      });

      const queued = pendingSaves.current.get(id) ?? {};
      pendingSaves.current.set(id, { ...queued, ...draft });
      setSaveState("dirty");

      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        flushSaves().catch(console.error);
      }, AUTOSAVE_DELAY_MS);
    },
    [flushSaves, isCloud]
  );

  const deleteEntry = useCallback(
    async (id: string) => {
      pendingSaves.current.delete(id);
      if (isCloud) {
        await api(`/api/journal/entries/${id}`, { method: "DELETE" });
        setEntries((prev) => prev.filter((e) => e.id !== id));
        return;
      }
      setEntries((prev) => {
        const next = prev.filter((e) => e.id !== id);
        persistLocal({ entries: next });
        return next;
      });
    },
    [isCloud, persistLocal]
  );

  // Flush pending edits when the tab is hidden or closed.
  useEffect(() => {
    const flush = () => {
      if (pendingSaves.current.size > 0) flushSaves().catch(() => {});
    };
    window.addEventListener("visibilitychange", flush);
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("visibilitychange", flush);
      window.removeEventListener("pagehide", flush);
    };
  }, [flushSaves]);

  const applyServerEntries = useCallback((updated: JournalEntry[]) => {
    setEntries((prev) => {
      const byId = new Map(updated.map((e) => [e.id, e]));
      return prev.map((e) => byId.get(e.id) ?? e);
    });
  }, []);

  return useMemo(
    () => ({
      isCloud,
      loading: loading || storageMode === "loading",
      notebooks,
      entries,
      saveState,
      lastSavedAt,
      refresh,
      createNotebook,
      renameNotebook,
      deleteNotebook,
      createEntry,
      updateEntry,
      deleteEntry,
      applyServerEntries,
    }),
    [
      isCloud,
      loading,
      storageMode,
      notebooks,
      entries,
      saveState,
      lastSavedAt,
      refresh,
      createNotebook,
      renameNotebook,
      deleteNotebook,
      createEntry,
      updateEntry,
      deleteEntry,
      applyServerEntries,
    ]
  );
}
