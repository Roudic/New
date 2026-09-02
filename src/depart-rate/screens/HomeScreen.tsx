"use client";

import { useState } from "react";
import type { Daypart, LaneConfig, Session } from "../types";
import { STORE_NUMBER, TARGET_CPH, TARGET_CPH_OPTIONS } from "../types";
import { SessionCard } from "../components/SessionCard";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { getActiveSession } from "../lib/storage";
import { formatDaypartLabel, targetGapSeconds } from "../lib/calculations";

interface HomeScreenProps {
  sessions: Session[];
  onStartSession: (opts: {
    daypart: Daypart;
    laneConfig: LaneConfig;
    note: string;
    targetCph: number;
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
  const [daypart, setDaypart] = useState<Daypart>(guessDaypart());
  const [laneConfig, setLaneConfig] = useState<LaneConfig>("double");
  const [targetCph, setTargetCph] = useState<number>(TARGET_CPH);
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
          Depart Rate
        </h1>
        <p className="mt-1 text-lg font-medium text-cfa">{STORE_NUMBER}</p>
        <p className="mt-2 text-sm text-zinc-500">
          Speed of service · Pull timer for the drive-thru leader
        </p>
      </header>

      {activeSession && (
        <div className="mb-6 rounded-2xl border border-cfa/40 bg-cfa/10 p-4">
          <p className="font-semibold text-white">Session in progress</p>
          <p className="mt-1 text-sm text-zinc-400">
            {formatDaypartLabel(activeSession.daypart)} ·{" "}
            {activeSession.departures.length} cars · {activeSession.targetCph} CPH target
          </p>
          <button
            type="button"
            onClick={() => onResumeSession(activeSession.id)}
            className="mt-3 w-full rounded-xl bg-cfa py-3 text-base font-bold text-white active:bg-cfa-dark"
          >
            RESUME SESSION
          </button>
        </div>
      )}

      {!activeSession && (
        <div className="mb-6 space-y-4 rounded-2xl bg-zinc-900 p-5">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Daypart
            </label>
            <div className="flex gap-2">
              {(["breakfast", "lunch", "afternoon", "dinner"] as Daypart[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDaypart(d)}
                  className={`flex-1 rounded-xl py-3 text-xs font-semibold capitalize sm:text-sm ${
                    daypart === d
                      ? "bg-cfa text-white"
                      : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  {d === "afternoon" ? "Aft" : d.slice(0, 3)}
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
                      ? "bg-cfa text-white"
                      : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Depart-rate target
            </label>
            <div className="grid grid-cols-4 gap-2">
              {TARGET_CPH_OPTIONS.map((cph) => (
                <button
                  key={cph}
                  type="button"
                  onClick={() => setTargetCph(cph)}
                  className={`rounded-xl py-3 text-sm font-semibold ${
                    targetCph === cph
                      ? "bg-cfa text-white"
                      : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  {cph}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              {targetCph} CPH · pull every {targetGapSeconds(targetCph).toFixed(1)}s
            </p>
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
              placeholder='e.g. "Cordell leading DT"'
              className="w-full rounded-xl bg-zinc-800 px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-cfa/50"
            />
          </div>

          <button
            type="button"
            onClick={() => onStartSession({ daypart, laneConfig, note, targetCph })}
            className="w-full rounded-2xl bg-cfa py-5 text-xl font-black tracking-wide text-white shadow-lg shadow-red-600/20 active:scale-[0.98] active:bg-cfa-dark"
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

function guessDaypart(): Daypart {
  const hour = new Date().getHours();
  if (hour < 10) return "breakfast";
  if (hour < 14) return "lunch";
  if (hour < 17) return "afternoon";
  return "dinner";
}
