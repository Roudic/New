import assert from "node:assert/strict";
import {
  carCount,
  computeWindowStats,
  currentCar,
  formatWindowTime,
  getFifteenMinBlocks,
  overallCph,
  rollingCph,
  sosBand,
  windowSeconds,
} from "../src/lib/drive-thru/calculations";
import type { Session } from "../src/lib/drive-thru/types";

const startedAt = new Date(2026, 8, 2, 11, 0, 0, 0).getTime();

function session(partial: Partial<Session> = {}): Session {
  return {
    id: "s1",
    daypart: "lunch",
    laneConfig: "double",
    note: "",
    startedAt,
    endedAt: startedAt + 15 * 60 * 1000,
    cars: [],
    flags: [],
    ...partial,
  };
}

const live = session({
  endedAt: null,
  cars: [
    { id: "1", arrivedAt: startedAt + 5_000, departedAt: startedAt + 22_000 },
    { id: "2", arrivedAt: startedAt + 28_000, departedAt: startedAt + 50_000 },
    { id: "3", arrivedAt: startedAt + 55_000, departedAt: null },
  ],
});

assert.equal(carCount(live), 2);
assert.equal(currentCar(live)?.id, "3");
assert.equal(windowSeconds(live.cars[0]), 17);
assert.equal(windowSeconds(live.cars[2]), null);

const stats = computeWindowStats(live);
assert.equal(stats.totalCars, 2);
assert.equal(stats.timedCars, 2);
assert.equal(stats.averageSec, 19.5);
assert.equal(stats.fastestSec, 17);
assert.equal(stats.slowestSec, 22);
assert.equal(stats.underTarget, 2);
assert.equal(sosBand(17), "good");
assert.equal(sosBand(30), "watch");
assert.equal(sosBand(50), "hot");
assert.equal(formatWindowTime(22_000), "0:22");
assert.equal(formatWindowTime(82, "sec"), "1:22");

const cph = overallCph(40, 15 * 60 * 1000);
assert.equal(Math.round(cph), 160);

const earlyCph = rollingCph([startedAt + 10_000, startedAt + 20_000], startedAt + 60_000, startedAt);
assert.ok(earlyCph > 100);

const blocks = getFifteenMinBlocks(
  session({
    cars: [
      { id: "a", arrivedAt: startedAt, departedAt: startedAt + 20_000 },
      { id: "b", arrivedAt: startedAt + 30_000, departedAt: startedAt + 50_000 },
    ],
  }),
  startedAt + 15 * 60 * 1000
);
assert.equal(blocks.length, 2);
assert.equal(blocks[0].count, 2);
assert.equal(blocks[0].avgWindowSec, 20);

console.log("drive-thru timer calculations: ok");
