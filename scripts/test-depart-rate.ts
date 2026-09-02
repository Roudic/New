import assert from "node:assert/strict";
import {
  computePullState,
  lastBeatAt,
  targetGapSeconds,
} from "../drive-thru-pulse/src/lib/calculations";

assert.equal(targetGapSeconds(160), 22.5);
assert.equal(targetGapSeconds(180), 20);
assert.equal(targetGapSeconds(0), 22.5);

const start = 1_000_000;
assert.equal(lastBeatAt(start, []), start);
assert.equal(lastBeatAt(start, [start + 5000, start + 9000]), start + 9000);

const before = computePullState(start + 10_000, start, 160);
assert.equal(before.isPull, false);
assert.ok(before.remainingMs > 12_000);
assert.ok(before.progress > 0.4 && before.progress < 0.5);

const atBeat = computePullState(start + 22_500, start, 160);
assert.equal(atBeat.isPull, true);
assert.equal(atBeat.overtimeMs, 0);

const late = computePullState(start + 26_000, start, 160);
assert.equal(late.isPull, true);
assert.equal(late.overtimeMs, 3500);

console.log("depart-rate pull timer: ok");
