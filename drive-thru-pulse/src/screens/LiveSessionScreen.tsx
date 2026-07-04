import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "../types";
import { PaceIndicator } from "../components/PaceIndicator";
import { FlagPicker } from "../components/FlagPicker";
import { ConfirmDialog } from "../components/ConfirmDialog";
import {
  avgGapLastN,
  formatDuration,
  rollingCph,
} from "../lib/calculations";
import { useWakeLock } from "../hooks/useWakeLock";

interface LiveSessionScreenProps {
  session: Session;
  onUpdate: (session: Session) => void;
  onEnd: () => void;
  onBack: () => void;
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

  sessionRef.current = session;
  useWakeLock(true);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const persist = useCallback(
    (updated: Session) => {
      onUpdate(updated);
    },
    [onUpdate],
  );

  const handleTap = useCallback(() => {
    const current = sessionRef.current;
    const updated: Session = {
      ...current,
      departures: [...current.departures, Date.now()],
    };
    persist(updated);
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
      const current = sessionRef.current;
      persist({
        ...current,
        flags: [...current.flags, { at: Date.now(), reason }],
      });
      setShowFlagPicker(false);
    },
    [persist],
  );

  const elapsed = now - session.startedAt;
  const cph = rollingCph(session.departures, now, session.startedAt);
  const avgGap = avgGapLastN(session.departures);

  return (
    <div className="flex min-h-dvh flex-col bg-background">
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
          <Stat label="CPH" value={String(Math.round(cph))} large />
          <Stat label="Time" value={formatDuration(elapsed)} />
          <Stat
            label="Avg gap"
            value={avgGap !== null ? `${avgGap.toFixed(1)}s` : "—"}
          />
        </div>

        <div className="mt-3">
          <PaceIndicator cph={cph} />
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center p-4">
        <button
          type="button"
          onClick={handleTap}
          className={`flex w-full max-w-lg flex-col items-center justify-center rounded-3xl bg-cfa-red shadow-2xl shadow-cfa-red/30 active:bg-cfa-red-dark ${
            tapping ? "animate-tap-flash animate-tap-scale" : ""
          }`}
          style={{ minHeight: "60vh" }}
        >
          <span className="text-4xl font-black tracking-wider text-white sm:text-5xl">
            CAR
          </span>
          <span className="text-4xl font-black tracking-wider text-white sm:text-5xl">
            DEPARTED
          </span>
          <span className="mt-4 text-lg font-medium text-white/70">
            Tap every departure
          </span>
        </button>
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
