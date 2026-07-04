import type { Session } from "../types";
import {
  formatDaypartLabel,
  formatDuration,
  overallCph,
} from "../lib/calculations";

interface SessionCardProps {
  session: Session;
  onOpen: () => void;
  onDelete: () => void;
}

export function SessionCard({ session, onOpen, onDelete }: SessionCardProps) {
  const endedAt = session.endedAt ?? Date.now();
  const duration = endedAt - session.startedAt;
  const cph = overallCph(session.departures.length, duration);
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
      className="w-full rounded-xl bg-surface px-4 py-4 text-left active:bg-surface-elevated"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-white">{dateStr}</p>
          <p className="text-sm text-zinc-400">
            {formatDaypartLabel(session.daypart)} · {session.laneConfig} lane
          </p>
          {session.note && (
            <p className="mt-1 text-xs text-zinc-500">{session.note}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold tabular-nums text-white">
            {session.departures.length}
          </p>
          <p className="text-xs text-zinc-500">cars</p>
        </div>
      </div>
      <div className="mt-2 flex gap-4 text-xs text-zinc-400">
        <span>{formatDuration(duration)}</span>
        <span>{Math.round(cph)} CPH</span>
        {session.endedAt === null && (
          <span className="font-semibold text-cfa-red">Active</span>
        )}
      </div>
      <p className="mt-2 text-[10px] text-zinc-600">Long-press to delete</p>
    </button>
  );
}
