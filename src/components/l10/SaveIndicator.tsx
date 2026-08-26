"use client";

import { Check, CloudOff, Loader2 } from "lucide-react";
import type { SaveState } from "@/lib/useL10";

export function SaveIndicator({
  saveState,
  lastSavedAt,
  isCloud,
}: {
  saveState: SaveState;
  lastSavedAt: Date | null;
  isCloud: boolean;
}) {
  if (saveState === "saving" || saveState === "dirty") {
    return (
      <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Saving…
      </span>
    );
  }
  if (saveState === "error") {
    return (
      <span className="flex items-center gap-1.5 text-xs font-semibold text-rose-600">
        <CloudOff className="h-3.5 w-3.5" />
        Save failed — will retry
      </span>
    );
  }
  if (saveState === "saved" && lastSavedAt) {
    return (
      <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
        <Check className="h-3.5 w-3.5" />
        Saved{" "}
        {lastSavedAt.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}
        {!isCloud && " (this device)"}
      </span>
    );
  }
  return null;
}
