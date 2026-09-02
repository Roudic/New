import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "../types";
import { PaceIndicator } from "../components/PaceIndicator";
import { PullClock } from "../components/PullClock";
import { FlagPicker } from "../components/FlagPicker";
import { ConfirmDialog } from "../components/ConfirmDialog";
import {
  avgGapLastN,
  computePullState,
  formatDuration,
  lastBeatAt,
  rollingCph,
  targetGapSeconds,
} from "../lib/calculations";
import { useWakeLock } from "../hooks/useWakeLock";

interface LiveSessionScreenProps {
  session: Session;
  onUpdate: (session: Session) => void;
  onEnd: () => void;
  onBack: () => void;
}

function beep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = 880;
    gain.gain.value = 0.08;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
    osc.onended = () => void ctx.close();
  } catch {
    // Audio is optional.
  }
}

export function LiveSessionScreen({
  session,
  onUpdate,
  onEnd,
  onBack,
}: LiveSessionScreenProps) {
  const [now, setNow] = useState(Date.now());
  const [tapping, setTapping] = useState(false);
  const [showFlagPicker, setShowFlagPicker] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const sessionRef = useRef(session);
  const wasPull = useRef(false);

  sessionRef.current = session;
  useWakeLock(true);

  const lastBeat = lastBeatAt(session.startedAt, session.departures);
  const pull = computePullState(now, lastBeat, session.targetCph);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (pull.isPull && !wasPull.current) {
      beep();
      navigator.vibrate?.(200);
    }
    wasPull.current = pull.isPull;
  }, [pull.isPull]);

  const persist = useCallback(
    (updated: Session) => {
      onUpdate(updated);
    },
    [onUpdate],
  );

  const handleDepart = useCallback(() => {
    const current = sessionRef.current;
    persist({
      ...current,
      departures: [...current.departures, Date.now()],
    });
    setTapping(true);
    setTimeout(() => setTapping(false), 150);
  }, [persist]);

  const handleUndo = useCallback(() => {
    const current = sessionRef.current;
    if (current.departures.length === 0) return;
    persist({
      ...current,
      departures: current.departures.slice(0, -1),
    });
  }, [persist]);

  const handleFlag = useCallback(
    (reason: string) => {
      persist({
        ...sessionRef.current,
        flags: [...sessionRef.current.flags, { at: Date.now(), reason }],
      });
      setShowFlagPicker(false);
    },
    [persist],
  );

  const elapsed = now - session.startedAt;
  const cph = rollingCph(session.departures, now, session.startedAt);
  const avgGap = avgGapLastN(session.departures);

  return (
    <div
      className={`flex min-h-dvh flex-col ${pull.isPull ? "bg-[#1a0709]" : "bg-background"}`}
    >
      <div className="shrink-0 border-b border-zinc-800 bg-surface px-4 py-3">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="text-sm font-medium text-zinc-500 active:text-white"
          >
            ← Home
          </button>
          <button
            type="button"
            onClick={handleUndo}
            disabled={session.departures.length === 0}
            className="rounded-lg px-3 py-1.5 text-sm font-semibold text-zinc-400 disabled:opacity-30 active:text-white"
          >
            UNDO
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2 text-center">
          <Stat label="Cars" value={String(session.departures.length)} large />
          <Stat label="Depart" value={String(Math.round(cph))} large />
          <Stat label="Target" value={String(session.targetCph)} />
          <Stat label="Time" value={formatDuration(elapsed)} />
        </div>

        <div className="mt-3">
          <PaceIndicator cph={cph} targetCph={session.targetCph} />
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
        <PullClock state={pull} />

        <button
          type="button"
          onClick={handleDepart}
          className={`flex w-full max-w-lg flex-col items-center justify-center rounded-3xl bg-cfa-red py-8 shadow-2xl shadow-cfa-red/30 active:bg-cfa-red-dark ${
            tapping ? "animate-tap-flash animate-tap-scale" : ""
          }`}
        >
          <span className="text-3xl font-black tracking-wider text-white sm:text-4xl">
            CAR DEPARTED
          </span>
          <span className="mt-2 text-sm font-medium text-white/70">
            Tap every car that leaves — resets the pull clock
          </span>
        </button>

        <p className="text-xs text-zinc-500">
          {avgGap != null ? `Last 10-car gap ${avgGap.toFixed(1)}s` : "Waiting on the first car"}
          {" · "}
          {session.targetCph} CPH = {targetGapSeconds(session.targetCph).toFixed(1)}s between cars
        </p>
      </div>

      <div className="flex shrink-0 gap-3 border-t border-zinc-800 p-4">
        <button
          type="button"
          onClick={() => setShowFlagPicker(true)}
          className="flex-1 rounded-xl bg-zinc-800 py-4 text-base font-bold text-white active:bg-zinc-700"
        >
          FLAG
        </button>
        <button
          type="button"
          onClick={() => setShowEndConfirm(true)}
          className="flex-1 rounded-xl border border-zinc-700 py-4 text-base font-bold text-zinc-400 active:border-cfa-red active:text-cfa-red"
        >
          END SESSION
        </button>
      </div>

      {showFlagPicker && (
        <FlagPicker
          onSelect={handleFlag}
          onCancel={() => setShowFlagPicker(false)}
        />
      )}

      {showEndConfirm && (
        <ConfirmDialog
          title="End session?"
          message={`You've logged ${session.departures.length} cars. This will finalize the session and show the report.`}
          confirmLabel="End session"
          onConfirm={() => {
            setShowEndConfirm(false);
            onEnd();
          }}
          onCancel={() => setShowEndConfirm(false)}
        />
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  large,
}: {
  label: string;
  value: string;
  large?: boolean;
}) {
  return (
    <div>
      <p
        className={`font-black tabular-nums text-white ${large ? "text-2xl sm:text-3xl" : "text-lg sm:text-xl"}`}
      >
        {value}
      </p>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        {label}
      </p>
    </div>
  );
}
