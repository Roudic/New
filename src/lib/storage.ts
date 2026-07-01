import type { AppState, ChecklistRun } from "./types";

const STORAGE_KEY = "jolt-checklist-app";

export const defaultAppState: AppState = {
  settings: {
    employeeName: "",
    locationName: "Main Street Location",
  },
  runs: [],
};

export function loadAppState(): AppState {
  if (typeof window === "undefined") {
    return defaultAppState;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultAppState;
    return { ...defaultAppState, ...JSON.parse(raw) } as AppState;
  } catch {
    return defaultAppState;
  }
}

export function saveAppState(state: AppState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function getActiveRuns(runs: ChecklistRun[]): ChecklistRun[] {
  return runs
    .filter((r) => r.status === "in_progress")
    .sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );
}

export function getCompletedRuns(runs: ChecklistRun[]): ChecklistRun[] {
  return runs
    .filter((r) => r.status === "completed")
    .sort(
      (a, b) =>
        new Date(b.completedAt ?? b.startedAt).getTime() -
        new Date(a.completedAt ?? a.startedAt).getTime()
    );
}
