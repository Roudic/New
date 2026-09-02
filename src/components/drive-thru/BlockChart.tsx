"use client";

import type { FifteenMinBlock } from "@/lib/drive-thru/calculations";
import { blockBarColor, formatBlockRange } from "@/lib/drive-thru/calculations";

const BAR_COLORS = {
  green: "#22c55e",
  yellow: "#eab308",
  red: "#ef4444",
};

export function BlockChart({ blocks }: { blocks: FifteenMinBlock[] }) {
  if (blocks.length === 0) {
    return <p className="text-center text-sm text-zinc-500">No cars logged yet.</p>;
  }

  const maxCount = Math.max(...blocks.map((b) => b.count), 40);

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-1.5 sm:gap-2" style={{ minHeight: 160 }}>
        {blocks.map((block) => {
          const height = maxCount > 0 ? (block.count / maxCount) * 100 : 0;
          const color = blockBarColor(block.count);
          return (
            <div key={block.startMs} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-[10px] font-bold tabular-nums text-zinc-300 sm:text-xs">
                {block.count}
              </span>
              <div className="flex w-full flex-1 items-end">
                <div
                  className="w-full rounded-t transition-all duration-300"
                  style={{
                    height: `${Math.max(height, block.count > 0 ? 4 : 0)}%`,
                    backgroundColor: BAR_COLORS[color],
                    minHeight: block.count > 0 ? 4 : 0,
                  }}
                />
              </div>
              <span className="hidden text-[9px] text-zinc-500 sm:block">
                {formatBlockRange(block.startMs, block.endMs).split("–")[0]}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex justify-center gap-4 text-xs text-zinc-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-sm bg-emerald-500" />
          40+ (160 pace)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-sm bg-yellow-500" />
          38–39
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-sm bg-red-500" />
          &lt;38
        </span>
      </div>
    </div>
  );
}
