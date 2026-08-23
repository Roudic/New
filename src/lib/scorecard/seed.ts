import seedData from "./seed-data.json";
import type { ScorecardState } from "./types";
import { DEFAULT_LOCATION } from "./types";

export function seedScorecard(): ScorecardState {
  return {
    location: seedData.location ?? DEFAULT_LOCATION,
    days: seedData.days,
    monthly: seedData.monthly,
    goals: seedData.goals,
  } as ScorecardState;
}
