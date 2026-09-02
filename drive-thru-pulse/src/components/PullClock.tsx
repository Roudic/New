import type { PullState } from "../lib/calculations";
import { formatPullSeconds } from "../lib/calculations";

const COLORS = {
  green: "#22c55e",
  yellow: "#eab308",
  red: "#ef4444",
};

function ringColor(state: PullState): string {
  if (state.isPull) return COLORS.red;
  if (state.progress >= 0.8) return COLORS.yellow;
  return COLORS.green;
}

interface PullClockProps {
  state: PullState;
}

export function PullClock({ state }: PullClockProps) {
  const color = ringColor(state);
  const size = 240;
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - state.progress);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#27272a"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset,stroke] duration-100"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {state.isPull ? (
          <>
            <p
              className="text-5xl font-black tracking-wide text-white"
              style={{ color: COLORS.red }}
            >
              PULL
            </p>
            <p className="mt-1 text-2xl font-black tabular-nums text-red-400">
              +{formatPullSeconds(state.overtimeMs)}s
            </p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Send the next car
            </p>
          </>
        ) : (
          <>
            <p className="text-6xl font-black tabular-nums tracking-tight text-white">
              {formatPullSeconds(state.remainingMs)}
            </p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Pull in
            </p>
            <p className="mt-1 text-[10px] font-medium text-zinc-600">
              {state.targetGapSec.toFixed(1)}s pace
            </p>
          </>
        )}
      </div>
    </div>
  );
}
