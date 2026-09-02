"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import type { Daypart, LaneConfig, Session, TimerScreen } from "@/lib/drive-thru/types";
import {
  deleteSession,
  getSessionById,
  loadSessions,
  saveSessions,
  upsertSession,
} from "@/lib/drive-thru/storage";
import { currentCar } from "@/lib/drive-thru/calculations";
import { TimerHome } from "./TimerHome";
import { TimerLive } from "./TimerLive";
import { TimerReport } from "./TimerReport";

export function TimerApp() {
  const router = useRouter();
  const { hydrated, isLoggedIn, settings } = useApp();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState<TimerScreen>("home");
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [reportSessionId, setReportSessionId] = useState<string | null>(null);

  const homeHref = settings.role === "ADMIN" ? "/admin" : "/employee";

  useEffect(() => {
    if (!hydrated) return;
    if (!isLoggedIn) {
      router.replace("/login");
      return;
    }
    const loaded = loadSessions();
    setSessions(loaded);
    const active = loaded.find((s) => s.endedAt === null);
    if (active) {
      setActiveSessionId(active.id);
      setScreen("live");
    }
    setReady(true);
  }, [hydrated, isLoggedIn, router]);

  useEffect(() => {
    if (!ready) return;
    saveSessions(sessions);
  }, [sessions, ready]);

  const activeSession = activeSessionId ? getSessionById(sessions, activeSessionId) : null;
  const reportSession = reportSessionId ? getSessionById(sessions, reportSessionId) : null;

  const handleStartSession = useCallback(
    (opts: { daypart: Daypart; laneConfig: LaneConfig; note: string }) => {
      const session: Session = {
        id: crypto.randomUUID(),
        daypart: opts.daypart,
        laneConfig: opts.laneConfig,
        note: opts.note,
        startedAt: Date.now(),
        endedAt: null,
        cars: [],
        flags: [],
      };
      setSessions((prev) => upsertSession(prev, session));
      setActiveSessionId(session.id);
      setScreen("live");
    },
    []
  );

  const handleUpdateSession = useCallback((session: Session) => {
    setSessions((prev) => {
      const next = upsertSession(prev, session);
      saveSessions(next);
      return next;
    });
  }, []);

  const handleEndSession = useCallback(() => {
    if (!activeSessionId) return;
    setSessions((prev) => {
      const session = getSessionById(prev, activeSessionId);
      if (!session) return prev;
      const now = Date.now();
      const hanging = currentCar(session);
      const cars = hanging
        ? session.cars.map((c) => (c.id === hanging.id ? { ...c, departedAt: now } : c))
        : session.cars;
      return upsertSession(prev, { ...session, cars, endedAt: now });
    });
    setReportSessionId(activeSessionId);
    setActiveSessionId(null);
    setScreen("report");
  }, [activeSessionId]);

  const handleDeleteSession = useCallback(
    (id: string) => {
      setSessions((prev) => deleteSession(prev, id));
      if (reportSessionId === id) {
        setReportSessionId(null);
        setScreen("home");
      }
    },
    [reportSessionId]
  );

  if (!hydrated || !isLoggedIn || !ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0d0d0f] text-zinc-500">
        Loading window timer…
      </div>
    );
  }

  if (screen === "live" && activeSession) {
    return (
      <TimerLive
        session={activeSession}
        onUpdate={handleUpdateSession}
        onEnd={handleEndSession}
        onBack={() => setScreen("home")}
      />
    );
  }

  if (screen === "report" && reportSession) {
    return (
      <TimerReport
        session={reportSession}
        onBack={() => {
          setScreen("home");
          setReportSessionId(null);
        }}
      />
    );
  }

  return (
    <TimerHome
      sessions={sessions}
      homeHref={homeHref}
      onStartSession={handleStartSession}
      onOpenReport={(id) => {
        setReportSessionId(id);
        setScreen("report");
      }}
      onDeleteSession={handleDeleteSession}
      onResumeSession={(id) => {
        setActiveSessionId(id);
        setScreen("live");
      }}
    />
  );
}
