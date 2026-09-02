export type Daypart = "breakfast" | "lunch" | "afternoon" | "dinner";
export type LaneConfig = "single" | "double";
export type TimerScreen = "home" | "live" | "report";

export interface Flag {
  at: number;
  reason: string;
}

export interface Car {
  id: string;
  /** Null when the car was logged as a departure-only tap (unknown window time). */
  arrivedAt: number | null;
  /** Null while the car is still at the window. */
  departedAt: number | null;
}

export interface Session {
  id: string;
  daypart: Daypart;
  laneConfig: LaneConfig;
  note: string;
  startedAt: number;
  endedAt: number | null;
  cars: Car[];
  flags: Flag[];
}

export const FLAG_REASONS = [
  "Pull-forward lag",
  "Payment delay",
  "Order not ready",
  "Lane blocked",
  "Other",
] as const;

export const TARGET_CPH = 160;
export const TARGET_GAP_SECONDS = 22.5;
export const STALL_THRESHOLD_SECONDS = 45;
export const TARGET_WINDOW_SECONDS = 25;
export const WINDOW_WATCH_SECONDS = 35;
export const WINDOW_HOT_SECONDS = 45;
