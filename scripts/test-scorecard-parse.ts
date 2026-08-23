import fs from "node:fs";
import { parseCsvText } from "../src/lib/scorecard/parse-csv";
import { parseCemsText } from "../src/lib/scorecard/parse-cems";
import { parseIntervalText, rollupIntervals } from "../src/lib/scorecard/parse-interval";
import { parseScorecardText } from "../src/lib/scorecard/parse";
import { parseSosText } from "../src/lib/scorecard/parse-sos";
import { parseWorkbookText } from "../src/lib/scorecard/parse-workbook";
import { rollupMonth } from "../src/lib/scorecard/calculations";
import { mergeParseResult } from "../src/lib/scorecard/merge";
import { seedJune12Intervals } from "../src/lib/scorecard/seed-intervals";
import { emptyScorecard } from "../src/lib/scorecard/types";
import pdf from "pdf-parse";

function assert(cond: unknown, message: string) {
  if (!cond) throw new Error(message);
}

function close(a: number | undefined, b: number, message: string) {
  assert(a != null && Math.abs(a - b) < 1.5, `${message} (got ${a}, expected ~${b})`);
}

async function testWorkbookPdf() {
  const pdfPath =
    process.argv[2] ??
    "/home/ubuntu/.cursor/projects/workspace/uploads/Copy_of_CFA-Hueytown-Scorecard_c63a.pdf";
  const buffer = fs.readFileSync(pdfPath);
  const extracted = await pdf(buffer);
  const parsed = parseWorkbookText(extracted.text);

  const may22 = parsed.days.find((d) => d.date === "2026-05-22" && d.kind === "day");
  const may25 = parsed.days.find((d) => d.date === "2026-05-25" && d.kind === "day");
  const jun8 = parsed.days.find((d) => d.date === "2026-06-08" && d.kind === "day");
  const jun12 = parsed.days.find((d) => d.date === "2026-06-12" && d.kind === "day");
  const goals26 = parsed.goals.find((g) => g.year === 2026);
  const mayMonthly = parsed.monthly.find((m) => m.year === 2026 && m.month === 5);

  assert(parsed.location === "Chick-fil-A Hueytown", "location");
  assert(!parsed.kinds.includes("interval"), `workbook should not look like a 15-min report: ${parsed.kinds}`);
  assert((may22?.salesActual ?? 0) === 40163, `May 22 sales ${may22?.salesActual}`);
  close(may22?.laborActual, 7994, "May 22 labor");
  close(may22?.dtSosTotalSec, 7 * 60 + 25, "May 22 SOS");
  close(may22?.dtSosBreakfastSec, 5 * 60 + 35, "May 22 breakfast");
  close(may25?.osat, 69.4, "May 25 OSAT");
  close(may25?.osatAccuracy, 94, "May 25 accuracy");
  close(jun8?.salesActual, 28056, "June 8 sales (missing Sales LY column)");
  close(jun8?.salesGoal, 30000, "June 8 goal");
  close(jun12?.dtSosDinnerSec, 11 * 60 + 51, "June 12 dinner");
  close(mayMonthly?.foodCostPct, 36.64, "May food cost");
  close(mayMonthly?.netProfitPct, -11.3, "May net profit");
  close(goals26?.laborTargetPct, 20, "2026 labor target");
  close(goals26?.osatGoal, 85, "2026 OSAT goal (8500% Excel bug)");
  close(goals26?.dtSosGoalMin, 5, "operational SOS goal");

  const state = mergeParseResult(emptyScorecard(), parsed);
  const june = rollupMonth(state, 2026, 6);
  close(june.salesActual, 370949, "June MTD sales");
  close(june.laborPct ?? 0, 22.63, "June labor %");

  const csv = parseCsvText(`Date,Sales Actual,Labor Actual $,OSAT,DT SOS Total
05/22/2026,"$40,163","$7,994",0.694,0:07:25
`);
  close(csv.days[0]?.salesActual, 40163, "CSV sales");
  close(csv.days[0]?.osat, 69.4, "CSV OSAT decimal");
  close(csv.days[0]?.dtSosTotalSec, 445, "CSV SOS");
  assert(Array.isArray(csv.intervals), "CSV intervals array");

  console.log(
    `ok workbook: ${parsed.days.length} daily rows, June sales ${june.salesActual}, kinds ${parsed.kinds.join(",")}`
  );
}

function testIntervalCsv() {
  const csv = `15 Minute Report
Business Date: Friday, June 12, 2026
Time,Sales,Trans,SOS,Cars
6:00 AM,400,28,4:30,26
6:15 AM,380,26,4:42,24
10:30 AM,620,42,5:40,40
14:00,410,28,6:06,26
17:00,380,24,11:51,22
`;
  const parsed = parseCsvText(csv);
  assert(parsed.kinds.includes("interval"), `interval kind ${parsed.kinds}`);
  assert(parsed.intervals.length === 5, `interval count ${parsed.intervals.length}`);
  assert(parsed.intervals[0].date === "2026-06-12", "interval business date");
  assert(parsed.intervals[0].dayOfWeek === "Friday", `weekday ${parsed.intervals[0].dayOfWeek}`);
  assert(parsed.intervals[0].daypart === "breakfast", "breakfast daypart");
  assert(parsed.intervals[2].daypart === "lunch", "lunch daypart");
  assert(parsed.intervals[3].daypart === "afternoon", "afternoon daypart");
  assert(parsed.intervals[4].daypart === "dinner", "dinner daypart");
  close(parsed.days[0]?.salesActual, 2190, "interval rollup sales");
  close(parsed.days[0]?.dtSosDinnerSec, 11 * 60 + 51, "interval dinner SOS");
  console.log("ok 15-min CSV");
}

function testIntervalText() {
  const blob = `15-Minute Sales and SOS
Report Date: 6/12/2026
Friday

Time            Sales     Trans    SOS
6:00 AM-6:15 AM  400.00    28       4:30
10:30 AM         620.00    42       5:40
14:00            410.00    28       6:06
17:00            380.00    24       11:51
`;
  const parsed = parseIntervalText(blob, "pdf");
  assert(parsed.intervals.length >= 4, `text intervals ${parsed.intervals.length}`);
  assert(parsed.intervals[0].date === "2026-06-12", "text report date");
  assert(parsed.intervals[0].dayOfWeek === "Friday", "text weekday");
  assert(parsed.kinds.includes("interval"), "text interval kind");
  console.log("ok 15-min text/PDF blob");
}

function testCemsFixture() {
  const fixture = `Customer Experience Measurement System
Chick-fil-A Hueytown
Survey Date: May 25, 2026

Overall Satisfaction    69.4%
Accuracy                94.0%
Clean                   86.7%
Taste                   82.6%
Temp                    54.2%
Fast                    79.9%
Courteous               69.6%
`;
  const parsed = parseCemsText(fixture, "pdf");
  const day = parsed.days[0];
  assert(parsed.kinds.includes("cems"), "cems kind");
  assert(day?.date === "2026-05-25", `cems date ${day?.date}`);
  close(day?.osat, 69.4, "CEMS OSAT");
  close(day?.osatAccuracy, 94, "CEMS accuracy");
  close(day?.osatClean, 86.7, "CEMS clean");
  close(day?.osatTaste, 82.6, "CEMS taste");
  close(day?.osatTemp, 54.2, "CEMS temp");
  close(day?.osatFast, 79.9, "CEMS fast");
  close(day?.osatCourteous, 69.6, "CEMS courteous");

  const buggy = parseCemsText(
    `CEMS
Report Date: 05/25/2026
Overall Satisfaction 0.694
Accuracy 8500%
`,
    "csv"
  );
  close(buggy.days[0]?.osat, 69.4, "CEMS decimal OSAT");
  close(buggy.days[0]?.osatAccuracy, 85, "CEMS 8500% accuracy");
  console.log("ok CEMS fixture");
}

function testStandaloneSos() {
  const snippet = `Drive-Thru Speed of Service
06/12 7:03
0:07:03
`;
  const parsed = parseSosText(snippet, "pdf");
  const day = parsed.days.find((d) => d.date === "2026-06-12");
  close(day?.dtSosTotalSec, 7 * 60 + 3, "standalone 7:03");

  const clock = parseScorecardText(`06/12 0:07:03\n`, "sos.txt");
  close(clock.days[0]?.dtSosTotalSec, 423, "0:07:03 duration");

  const dashboard = parseSosText(`06/12\n7:03\n+41%\n`, "pdf");
  close(dashboard.days[0]?.dtSosTotalSec, 423, "dashboard 06/12 7:03 +41%");
  console.log("ok standalone DT SOS");
}

function testSeedIntervalsAndMerge() {
  const intervals = seedJune12Intervals();
  assert(intervals.length === 64, `seed interval count ${intervals.length}`);
  assert(intervals[0].startMin === 6 * 60, "opens 6:00");
  assert(intervals.at(-1)?.startMin === 21 * 60 + 45, "last slot 9:45 PM");
  const rolled = rollupIntervals(intervals)[0];
  close(rolled.salesActual, 31395, "seed interval sales");
  close(rolled.transTy, 1998, "seed interval trans");
  close(rolled.dtSosTotalSec, 423, "seed interval SOS");
  close(rolled.dtSosBreakfastSec, 276, "seed breakfast SOS");
  close(rolled.dtSosLunchSec, 340, "seed lunch SOS");
  close(rolled.dtSosAfternoonSec, 366, "seed afternoon SOS");
  close(rolled.dtSosDinnerSec, 711, "seed dinner SOS");

  const existing = emptyScorecard();
  existing.days = [
    {
      date: "2026-06-12",
      dayOfWeek: "Friday",
      status: "Open",
      kind: "day",
      salesActual: 31395,
      laborActual: 6998,
    },
  ];
  const merged = mergeParseResult(existing, {
    days: rolled ? [rolled] : [],
    monthly: [],
    goals: [],
    intervals,
    warnings: [],
    kinds: ["interval"],
    source: "csv",
  });
  assert(merged.days[0].salesActual === 31395, "merge keeps sales");
  assert(merged.days[0].laborActual === 6998, "merge keeps labor");
  close(merged.days[0].dtSosTotalSec, 423, "merge fills SOS");
  assert(merged.intervals.length === 64, "merge stores intervals");
  console.log("ok seed intervals + merge fill");
}

async function main() {
  await testWorkbookPdf();
  testIntervalCsv();
  testIntervalText();
  testCemsFixture();
  testStandaloneSos();
  testSeedIntervalsAndMerge();
  console.log("ok: all scorecard parser tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
