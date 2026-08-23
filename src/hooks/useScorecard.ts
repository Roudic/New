"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import { mergeParseResult } from "@/lib/scorecard/merge";
import { seedScorecard } from "@/lib/scorecard/seed";
import {
  SCORECARD_STORAGE_KEY,
  type ParseResult,
  type ScorecardState,
} from "@/lib/scorecard/types";

function loadLocal(): ScorecardState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SCORECARD_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ScorecardState;
    if (!parsed || !Array.isArray(parsed.days)) return null;
    if (!Array.isArray(parsed.intervals)) parsed.intervals = [];
    return parsed;
  } catch {
    return null;
  }
}

function saveLocal(state: ScorecardState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SCORECARD_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota / private mode
  }
}

export function useScorecard() {
  const { storageMode, isLoggedIn, hydrated } = useApp();
  const isCloud = storageMode === "cloud" && isLoggedIn;
  const [state, setState] = useState<ScorecardState>(seedScorecard);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const persist = useCallback(
    async (next: ScorecardState) => {
      setState(next);
      saveLocal(next);
      if (!isCloud) return;
      setSaving(true);
      try {
        const res = await fetch("/api/scorecard", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ state: next }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? "Could not save scorecard");
        }
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save scorecard");
      } finally {
        setSaving(false);
      }
    },
    [isCloud]
  );

  useEffect(() => {
    if (!hydrated || storageMode === "loading") return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        if (isCloud) {
          const res = await fetch("/api/scorecard");
          const body = (await res.json()) as { state?: ScorecardState };
          if (!cancelled && body.state) {
            setState(body.state);
            saveLocal(body.state);
            return;
          }
        }
        const local = loadLocal();
        if (!cancelled) setState(local ?? seedScorecard());
      } catch {
        if (!cancelled) setState(loadLocal() ?? seedScorecard());
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated, isCloud, storageMode]);

  const applyParse = useCallback(
    async (parsed: ParseResult, filename: string, mode: "merge" | "replace" = "merge") => {
      const next = mergeParseResult(state, parsed, mode, {
        at: new Date().toISOString(),
        filename,
        kind: parsed.source,
        rows: parsed.days.length + parsed.intervals.length,
        warnings: parsed.warnings.map((w) => w.message),
      });
      await persist(next);
      return next;
    },
    [persist, state]
  );

  const resetToSeed = useCallback(async () => {
    await persist(seedScorecard());
  }, [persist]);

  return useMemo(
    () => ({
      state,
      loading,
      saving,
      error,
      isCloud,
      persist,
      applyParse,
      resetToSeed,
    }),
    [applyParse, error, isCloud, loading, persist, resetToSeed, saving, state]
  );
}
