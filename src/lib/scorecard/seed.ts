import seedData from "./seed-data.json";
import { seedJune12Intervals } from "./seed-intervals";
import type { IntervalRow, ScorecardState } from "./types";
import { DEFAULT_LOCATION } from "./types";

type SeedFile = {
  location?: string;
  days: ScorecardState["days"];
  monthly: ScorecardState["monthly"];
  goals: ScorecardState["goals"];
  intervals?: IntervalRow[];
};

export function seedScorecard(): ScorecardState {
  const data = seedData as SeedFile;
  return {
    location: data.location ?? DEFAULT_LOCATION,
    days: data.days,
    monthly: data.monthly,
    goals: data.goals,
    intervals: data.intervals?.length ? data.intervals : seedJune12Intervals(),
  };
}
