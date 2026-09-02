"use client";

import { useState } from "react";
import type { Daypart, LaneConfig, Session } from "@/lib/drive-thru/types";
import { ConfirmDialog } from "./ConfirmDialog";
import { getActiveSession } from "@/lib/drive-thru/storage";
import {
  carCount,
  computeWindowStats,
  formatDaypartLabel,
  formatDuration,
  formatWindowTime,
  overallCph,
} from "@/lib/drive-thru/calculations";

const DAYPARTS: Daypart[] = ["breakfast", "lunch", "afternoon", "dinner"];
const LANES: LaneConfig[] = ["single", "double"];

interface TimerHomeProps {
  sessions: Session[];
  homeHref: string;
  onStartSession: (opts: { daypart: Daypart; laneConfig: LaneConfig; note: string }) => void;
  onOpenReport: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onResumeSession: (sessionId: string) => void;
}

export function TimerHome({
  sessions,
  homeHref,
  onStartSession,
  onOpenReport,
  onDeleteSession,
  onResumeSession,
}: TimerHomeProps) {
  const [daypart, setDaypart] = useState<Daypart>(guessDaypart());
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
        <a href={homeHref} className="text-sm font-medium text-zinc-500 active:text-white">
          ← KitchenCheck
        </a>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
          Window Timer
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Tap when a car hits the window, tap again when it leaves. Tracks speed of service,
          car count, and CPH.
        </p>
      </header>

      {activeSession && (
        <div className="mb-6 rounded-2xl border border-cfa/40 bg-cfa/10 p-4">
          <p className="font-semibold text-white">Session in progress</p>
          <p className="mt-1 text-sm text-zinc-400">
            {formatDaypartLabel(activeSession.daypart)} · {carCount(activeSession)} cars logged
            {currentWindowLabel(activeSession)}
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
            <div className="grid grid-cols-4 gap-2">
              {DAYPARTS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDaypart(d)}
                  className={`rounded-xl py-3 text-xs font-semibold capitalize sm:text-sm ${
                    daypart === d ? "bg-cfa text-white" : "bg-zinc-800 text-zinc-400"
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
              {LANES.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLaneConfig(l)}
                  className={`flex-1 rounded-xl py-3 text-sm font-semibold capitalize ${
                    laneConfig === l ? "bg-cfa text-white" : "bg-zinc-800 text-zinc-400"
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
              className="w-full rounded-xl bg-zinc-800 px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-cfa/50"
            />
          </div>

          <button
            type="button"
            onClick={() => onStartSession({ daypart, laneConfig, note })}
            className="w-full rounded-2xl bg-cfa py-5 text-xl font-black tracking-wide text-white shadow-lg shadow-cfa/20 active:scale-[0.98] active:bg-cfa-dark"
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
            {pastSessions.map((s) => (
              <SessionCard
                key={s.id}
                session={s}
                onOpen={() => onOpenReport(s.id)}
                onDelete={() => setDeleteId(s.id)}
              />
            ))}
          </div>
        </section>
      )}

      {deleteId && (
        <ConfirmDialog
          title="Delete session?"
          message="This will permanently remove the session and all its car times."
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

function currentWindowLabel(session: Session): string {
  const atWindow = session.cars.some((c) => c.departedAt == null);
  return atWindow ? " · car at window" : "";
}

function SessionCard({
  session,
  onOpen,
  onDelete,
}: {
  session: Session;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const endedAt = session.endedAt ?? Date.now();
  const duration = endedAt - session.startedAt;
  const cars = carCount(session);
  const cph = overallCph(cars, duration);
  const sos = computeWindowStats(session);
  const date = new Date(session.startedAt);
  const dateStr = date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  let pressTimer: ReturnType<typeof setTimeout> | null = null;
  const startLongPress = () => {
    pressTimer = setTimeout(() => {
      onDelete();
      pressTimer = null;
    }, 600);
  };
  const cancelLongPress = () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
  };

  return (
    <button
      type="button"
      onClick={onOpen}
      onTouchStart={startLongPress}
      onTouchEnd={cancelLongPress}
      onTouchMove={cancelLongPress}
      onMouseDown={startLongPress}
      onMouseUp={cancelLongPress}
      onMouseLeave={cancelLongPress}
      className="w-full rounded-xl bg-zinc-900 px-4 py-4 text-left active:bg-zinc-800"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-white">{dateStr}</p>
          <p className="text-sm text-zinc-400">
            {formatDaypartLabel(session.daypart)} · {session.laneConfig} lane
          </p>
          {session.note && <p className="mt-1 text-xs text-zinc-500">{session.note}</p>}
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold tabular-nums text-white">{cars}</p>
          <p className="text-xs text-zinc-500">cars</p>
        </div>
      </div>
      <div className="mt-2 flex gap-4 text-xs text-zinc-400">
        <span>{formatDuration(duration)}</span>
        <span>
          SOS {sos.averageSec != null ? formatWindowTime(sos.averageSec, "sec") : "—"}
        </span>
        <span>{Math.round(cph)} CPH</span>
      </div>
      <p className="mt-2 text-[10px] text-zinc-600">Long-press to delete</p>
    </button>
  );
}
