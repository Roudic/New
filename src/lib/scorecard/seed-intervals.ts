import type { Daypart, IntervalRow } from "./types";
import { daypartFromMinutes, minutesToLabel } from "./values";

const DATE = "2026-06-12";
const DAY = "Friday";

const DAYPART_PLAN: Record<Daypart, { trans: number; sales: number; sos: number }> = {
  breakfast: { trans: 465, sales: 6145, sos: 276 },
  lunch: { trans: 680, sales: 11430, sos: 340 },
  afternoon: { trans: 350, sales: 5320, sos: 366 },
  dinner: { trans: 503, sales: 8500, sos: 711 },
};

function trafficWeight(startMin: number): number {
  const hour = startMin / 60;
  if (hour < 7) return 0.55;
  if (hour < 8) return 1.05;
  if (hour < 9) return 1.35;
  if (hour < 10.5) return 0.95;
  if (hour < 11.5) return 1.2;
  if (hour < 13) return 1.65;
  if (hour < 14) return 1.25;
  if (hour < 16) return 0.9;
  if (hour < 17) return 0.75;
  if (hour < 18) return 1.1;
  if (hour < 19.5) return 1.45;
  if (hour < 21) return 0.95;
  return 0.45;
}

function allocate(total: number, weights: number[]): number[] {
  const sum = weights.reduce((acc, weight) => acc + weight, 0) || 1;
  const raw = weights.map((weight) => (total * weight) / sum);
  const rounded = raw.map((value) => Math.max(0, Math.round(value)));
  let drift = total - rounded.reduce((acc, value) => acc + value, 0);
  let index = rounded.findIndex((value, i) => raw[i] === Math.max(...raw));
  if (index < 0) index = rounded.length - 1;
  while (drift !== 0 && rounded.length) {
    const step = drift > 0 ? 1 : -1;
    if (rounded[index] + step >= 0) {
      rounded[index] += step;
      drift -= step;
    }
    index = (index + 1) % rounded.length;
  }
  return rounded;
}

/** Friday 2026-06-12 intervals that roll up to the known daily totals. */
export function seedJune12Intervals(): IntervalRow[] {
  const starts: number[] = [];
  for (let minute = 6 * 60; minute < 22 * 60; minute += 15) starts.push(minute);

  const grouped: Record<Daypart, number[]> = {
    breakfast: [],
    lunch: [],
    afternoon: [],
    dinner: [],
  };
  for (const startMin of starts) grouped[daypartFromMinutes(startMin)].push(startMin);

  const rows: IntervalRow[] = [];
  (Object.keys(grouped) as Daypart[]).forEach((daypart) => {
    const slots = grouped[daypart];
    const plan = DAYPART_PLAN[daypart];
    const weights = slots.map(trafficWeight);
    const trans = allocate(plan.trans, weights);
    const sales = allocate(plan.sales, weights);
    slots.forEach((startMin, index) => {
      const guests = trans[index];
      rows.push({
        date: DATE,
        dayOfWeek: DAY,
        startMin,
        label: minutesToLabel(startMin),
        daypart,
        sales: sales[index],
        trans: guests,
        cars: Math.max(0, Math.round(guests * 0.82)),
        sosSec: plan.sos,
      });
    });
  });

  return rows.sort((a, b) => a.startMin - b.startMin);
}
