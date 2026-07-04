import { useCallback, useEffect, useState } from "react";
import type { Daypart, LaneConfig, Screen, Session } from "./types";
import { HomeScreen } from "./screens/HomeScreen";
import { LiveSessionScreen } from "./screens/LiveSessionScreen";
import { ReportScreen } from "./screens/ReportScreen";
import {
  deleteSession,
  getSessionById,
  loadSessions,
  saveSessions,
  upsertSession,
} from "./lib/storage";

function App() {
  const [sessions, setSessions] = useState<Session[]>(() => loadSessions());
  const [screen, setScreen] = useState<Screen>("home");
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [reportSessionId, setReportSessionId] = useState<string | null>(null);

  useEffect(() => {
    saveSessions(sessions);
  }, [sessions]);

  const activeSession = activeSessionId
    ? getSessionById(sessions, activeSessionId)
    : null;
  const reportSession = reportSessionId
    ? getSessionById(sessions, reportSessionId)
    : null;

  const handleStartSession = useCallback(
    (opts: { daypart: Daypart; laneConfig: LaneConfig; note: string }) => {
      const session: Session = {
        id: crypto.randomUUID(),
        daypart: opts.daypart,
        laneConfig: opts.laneConfig,
        note: opts.note,
        startedAt: Date.now(),
        endedAt: null,
        departures: [],
        flags: [],
      };
      setSessions((prev) => upsertSession(prev, session));
      setActiveSessionId(session.id);
      setScreen("live");
    },
    [],
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
      const ended: Session = { ...session, endedAt: Date.now() };
      return upsertSession(prev, ended);
    });
    setReportSessionId(activeSessionId);
    setActiveSessionId(null);
    setScreen("report");
  }, [activeSessionId]);

  const handleDeleteSession = useCallback((id: string) => {
    setSessions((prev) => deleteSession(prev, id));
    if (reportSessionId === id) {
      setReportSessionId(null);
      setScreen("home");
    }
  }, [reportSessionId]);

  if (screen === "live" && activeSession) {
    return (
      <LiveSessionScreen
        session={activeSession}
        onUpdate={handleUpdateSession}
        onEnd={handleEndSession}
        onBack={() => setScreen("home")}
      />
    );
  }

  if (screen === "report" && reportSession) {
    return (
      <ReportScreen
        session={reportSession}
        onBack={() => {
          setScreen("home");
          setReportSessionId(null);
        }}
      />
    );
  }

  return (
    <HomeScreen
      sessions={sessions}
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

export default App;
