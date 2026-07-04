export type Daypart = "breakfast" | "lunch" | "dinner";
export type LaneConfig = "single" | "double";

export interface Flag {
  at: number;
  reason: string;
}

export interface Session {
  id: string;
  daypart: Daypart;
  laneConfig: LaneConfig;
  note: string;
  startedAt: number;
  endedAt: number | null;
  departures: number[];
  flags: Flag[];
}

export type Screen = "home" | "live" | "report";

export const FLAG_REASONS = [
  "Pull-forward lag",
  "Payment delay",
  "Order not ready",
  "Lane blocked",
  "Other",
] as const;

export const STORE_NUMBER = "#03339";

export const TARGET_CPH = 160;
export const TARGET_GAP_SECONDS = 22.5;
export const STALL_THRESHOLD_SECONDS = 45;
export const BLOCK_MINUTES = 15;
export const BLOCK_TARGET_CARS = 40;
