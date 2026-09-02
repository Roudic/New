"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@/lib/drive-thru/types";
import { PaceBar } from "./PaceBar";
import { FlagPicker } from "./FlagPicker";
import { ConfirmDialog } from "./ConfirmDialog";
import { useWakeLock } from "@/hooks/useWakeLock";
import {
  avgGapLastN,
  carCount,
  computeWindowStats,
  currentCar,
  departureTimes,
  formatDuration,
  formatWindowTime,
  rollingCph,
  sosBand,
} from "@/lib/drive-thru/calculations";

interface TimerLiveProps {
  session: Session;
  onUpdate: (session: Session) => void;
  onEnd: () => void;
  onBack: () => void;
}

const BAND_COLORS = {
  good: "#22c55e",
  watch: "#eab308",
  hot: "#ef4444",
  na: "#a1a1aa",
};

export function TimerLive({ session, onUpdate, onEnd, onBack }: TimerLiveProps) {
  const [now, setNow] = useState(Date.now());
  const [tapping, setTapping] = useState(false);
  const [showFlagPicker, setShowFlagPicker] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const sessionRef = useRef(session);

  sessionRef.current = session;
  useWakeLock(true);

  const atWindow = currentCar(session);

  useEffect(() => {
    const ms = atWindow ? 100 : 1000;
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [atWindow]);

  const persist = useCallback(
    (updated: Session) => {
      onUpdate(updated);
    },
    [onUpdate]
  );

  const handleArrive = useCallback(() => {
    const current = sessionRef.current;
    if (currentCar(current)) return;
    persist({
      ...current,
      cars: [
        ...current.cars,
        { id: crypto.randomUUID(), arrivedAt: Date.now(), departedAt: null },
      ],
    });
    flash();
  }, [persist]);

  const handleDepart = useCallback(() => {
    const current = sessionRef.current;
    const car = currentCar(current);
    if (!car) return;
    persist({
      ...current,
      cars: current.cars.map((c) =>
        c.id === car.id ? { ...c, departedAt: Date.now() } : c
      ),
    });
    flash();
  }, [persist]);

  const handleUndo = useCallback(() => {
    const current = sessionRef.current;
    const car = currentCar(current);
    if (car) {
      persist({ ...current, cars: current.cars.filter((c) => c.id !== car.id) });
      return;
    }
    if (current.cars.length === 0) return;
    persist({ ...current, cars: current.cars.slice(0, -1) });
  }, [persist]);

  const handleFlag = useCallback(
    (reason: string) => {
      persist({
        ...sessionRef.current,
        flags: [...sessionRef.current.flags, { at: Date.now(), reason }],
      });
      setShowFlagPicker(false);
    },
    [persist]
  );

  function flash() {
    setTapping(true);
    setTimeout(() => setTapping(false), 150);
  }

  const elapsed = now - session.startedAt;
  const departures = departureTimes(session);
  const cars = carCount(session);
  const cph = rollingCph(departures, now, session.startedAt);
  const avgGap = avgGapLastN(departures);
  const windowStats = computeWindowStats(session);
  const liveMs = atWindow?.arrivedAt != null ? now - atWindow.arrivedAt : null;
  const liveSec = liveMs != null ? liveMs / 1000 : null;
  const band = sosBand(liveSec ?? windowStats.averageSec);
  const displayTime =
    liveMs != null
      ? formatWindowTime(liveMs)
      : windowStats.averageSec != null
        ? formatWindowTime(windowStats.averageSec, "sec")
        : "0:00";

  return (
    <div className="flex min-h-dvh flex-col bg-[#0d0d0f]">
      <div className="shrink-0 border-b border-zinc-800 bg-zinc-950 px-4 py-3">
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
            disabled={session.cars.length === 0}
            className="rounded-lg px-3 py-1.5 text-sm font-semibold text-zinc-400 disabled:opacity-30 active:text-white"
          >
            UNDO
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2 text-center">
          <Stat label="Cars" value={String(cars)} large />
          <Stat
            label="Avg SOS"
            value={
              windowStats.averageSec != null
                ? formatWindowTime(windowStats.averageSec, "sec")
                : "—"
            }
            large
          />
          <Stat label="CPH" value={String(Math.round(cph))} large />
          <Stat label="Time" value={formatDuration(elapsed)} />
        </div>

        <div className="mt-3">
          <PaceBar cph={cph} />
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center p-4">
        <button
          type="button"
          onClick={atWindow ? handleDepart : handleArrive}
          className={`flex w-full max-w-lg flex-col items-center justify-center rounded-3xl shadow-2xl ${
            atWindow
              ? "bg-cfa shadow-cfa/30 active:bg-cfa-dark"
              : "bg-emerald-600 shadow-emerald-600/30 active:bg-emerald-700"
          } ${tapping ? "scale-[0.97]" : ""}`}
          style={{ minHeight: "52vh" }}
        >
          <span
            className="text-7xl font-black tabular-nums tracking-tight text-white sm:text-8xl"
            style={{ color: atWindow ? BAND_COLORS[band] : undefined }}
          >
            {displayTime}
          </span>
          <span className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
            {atWindow ? "Window time" : cars > 0 ? "Avg speed of service" : "Waiting for a car"}
          </span>
          <span className="mt-8 text-3xl font-black tracking-wider text-white sm:text-4xl">
            {atWindow ? "CAR DEPARTED" : "CAR AT WINDOW"}
          </span>
          <span className="mt-2 text-sm font-medium text-white/70">
            {atWindow ? "Tap when they leave" : "Tap when they pull up"}
          </span>
        </button>
        {avgGap != null && (
          <p className="mt-4 text-xs text-zinc-500">
            Last 10-car gap {avgGap.toFixed(1)}s
            {windowStats.underTarget > 0
              ? ` · ${windowStats.underTarget}/${windowStats.timedCars} under 25s`
              : ""}
          </p>
        )}
      </div>

      <div className="flex shrink-0 gap-3 border-t border-zinc-800 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
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
          className="flex-1 rounded-xl border border-zinc-700 py-4 text-base font-bold text-zinc-400 active:border-cfa active:text-cfa"
        >
          END SESSION
        </button>
      </div>

      {showFlagPicker && (
        <FlagPicker onSelect={handleFlag} onCancel={() => setShowFlagPicker(false)} />
      )}

      {showEndConfirm && (
        <ConfirmDialog
          title="End session?"
          message={`You've logged ${cars} cars. This will finalize the session and show the report.`}
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
      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{label}</p>
    </div>
  );
}
