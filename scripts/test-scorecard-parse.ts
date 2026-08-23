import fs from "node:fs";
import path from "node:path";
import pdf from "pdf-parse";
import { parseCsvText } from "../src/lib/scorecard/parse-csv";
import { parseWorkbookText } from "../src/lib/scorecard/parse-workbook";
import { rollupMonth } from "../src/lib/scorecard/calculations";
import { mergeParseResult } from "../src/lib/scorecard/merge";
import { emptyScorecard } from "../src/lib/scorecard/types";

function assert(cond: unknown, message: string) {
  if (!cond) throw new Error(message);
}

function close(a: number | undefined, b: number, message: string) {
  assert(a != null && Math.abs(a - b) < 1.5, `${message} (got ${a}, expected ~${b})`);
}

async function main() {
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

  const out = path.join(process.cwd(), "src/lib/scorecard/seed-data.json");
  const seed = {
    location: parsed.location ?? "Chick-fil-A Hueytown",
    days: parsed.days.filter(
      (d) =>
        d.kind === "week" ||
        (d.salesActual && d.salesActual !== 0) ||
        (d.laborActual && d.laborActual !== 0)
    ),
    monthly: parsed.monthly,
    goals: parsed.goals,
  };
  fs.writeFileSync(out, JSON.stringify(seed, null, 2));
  console.log(
    `ok: ${parsed.days.length} daily rows, ${seed.days.length} seeded, June sales ${june.salesActual}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
