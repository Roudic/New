import { paceColor } from "../lib/calculations";

interface PaceIndicatorProps {
  cph: number;
}

const COLORS = {
  green: "#22c55e",
  yellow: "#eab308",
  red: "#ef4444",
};

export function PaceIndicator({ cph }: PaceIndicatorProps) {
  const color = paceColor(cph);
  const fillPercent = Math.min(100, (cph / 180) * 100);

  return (
    <div className="w-full">
      <div className="mb-1 flex items-center justify-between text-xs text-zinc-400">
        <span>Pace</span>
        <span className="font-semibold tabular-nums" style={{ color: COLORS[color] }}>
          {Math.round(cph)} CPH
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full transition-all duration-300 ease-out"
          style={{
            width: `${fillPercent}%`,
            backgroundColor: COLORS[color],
          }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-zinc-600">
        <span>&lt;150</span>
        <span>160 target</span>
        <span>180+</span>
      </div>
    </div>
  );
}
