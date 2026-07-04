import { useState } from "react";
import type { Daypart, LaneConfig, Session } from "../types";
import { STORE_NUMBER } from "../types";
import { SessionCard } from "../components/SessionCard";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { getActiveSession } from "../lib/storage";
import { formatDaypartLabel } from "../lib/calculations";

interface HomeScreenProps {
  sessions: Session[];
  onStartSession: (opts: {
    daypart: Daypart;
    laneConfig: LaneConfig;
    note: string;
  }) => void;
  onOpenReport: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onResumeSession: (sessionId: string) => void;
}

export function HomeScreen({
  sessions,
  onStartSession,
  onOpenReport,
  onDeleteSession,
  onResumeSession,
}: HomeScreenProps) {
  const [daypart, setDaypart] = useState<Daypart>("breakfast");
  const [laneConfig, setLaneConfig] = useState<LaneConfig>("double");
  const [note, setNote] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const activeSession = getActiveSession(sessions);
  const pastSessions = sessions
    .filter((s) => s.endedAt !== null)
    .sort((a, b) => b.startedAt - a.startedAt);

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 py-8">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
          Drive-Thru Pulse
        </h1>
        <p className="mt-1 text-lg font-medium text-cfa-red">{STORE_NUMBER}</p>
        <p className="mt-2 text-sm text-zinc-500">
          Vestavia Hills · Window departure timing
        </p>
      </header>

      {activeSession && (
        <div className="mb-6 rounded-2xl border border-cfa-red/40 bg-cfa-red/10 p-4">
          <p className="font-semibold text-white">Session in progress</p>
          <p className="mt-1 text-sm text-zinc-400">
            {formatDaypartLabel(activeSession.daypart)} ·{" "}
            {activeSession.departures.length} cars logged
          </p>
          <button
            type="button"
            onClick={() => onResumeSession(activeSession.id)}
            className="mt-3 w-full rounded-xl bg-cfa-red py-3 text-base font-bold text-white active:bg-cfa-red-dark"
          >
            RESUME SESSION
          </button>
        </div>
      )}

      {!activeSession && (
        <div className="mb-6 space-y-4 rounded-2xl bg-surface p-5">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Daypart
            </label>
            <div className="flex gap-2">
              {(["breakfast", "lunch", "dinner"] as Daypart[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDaypart(d)}
                  className={`flex-1 rounded-xl py-3 text-sm font-semibold capitalize ${
                    daypart === d
                      ? "bg-cfa-red text-white"
                      : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Lane config
            </label>
            <div className="flex gap-2">
              {(["single", "double"] as LaneConfig[]).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLaneConfig(l)}
                  className={`flex-1 rounded-xl py-3 text-sm font-semibold capitalize ${
                    laneConfig === l
                      ? "bg-cfa-red text-white"
                      : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="note"
              className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500"
            >
              Note (optional)
            </label>
            <input
              id="note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder='e.g. "Cordell on window"'
              className="w-full rounded-xl bg-zinc-800 px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-cfa-red/50"
            />
          </div>

          <button
            type="button"
            onClick={() => onStartSession({ daypart, laneConfig, note })}
            className="w-full rounded-2xl bg-cfa-red py-5 text-xl font-black tracking-wide text-white shadow-lg shadow-cfa-red/20 active:scale-[0.98] active:bg-cfa-red-dark"
          >
            START SESSION
          </button>
        </div>
      )}

      {pastSessions.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Past sessions
          </h2>
          <div className="space-y-2">
            {pastSessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                onOpen={() => onOpenReport(session.id)}
                onDelete={() => setDeleteId(session.id)}
              />
            ))}
          </div>
        </section>
      )}

      {deleteId && (
        <ConfirmDialog
          title="Delete session?"
          message="This will permanently remove the session and all its data."
          confirmLabel="Delete"
          onConfirm={() => {
            onDeleteSession(deleteId);
            setDeleteId(null);
          }}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  );
}
