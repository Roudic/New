import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import { ensureScorecardTable } from "@/lib/scorecard-db";
import { seedScorecard } from "@/lib/scorecard/seed";
import type { ScorecardState } from "@/lib/scorecard/types";

export const dynamic = "force-dynamic";

const STORE_ID = "hueytown";

function isState(value: unknown): value is ScorecardState {
  return Boolean(value && typeof value === "object" && Array.isArray((value as ScorecardState).days));
}

function withIntervals(state: ScorecardState): ScorecardState {
  return Array.isArray(state.intervals) ? state : { ...state, intervals: [] };
}

export async function GET() {
  try {
    await ensureScorecardTable();
    const row = await prisma.scorecardStore.findUnique({ where: { id: STORE_ID } });
    if (!row) {
      return NextResponse.json({ state: seedScorecard(), seeded: true });
    }
    const parsed = JSON.parse(row.payload) as unknown;
    if (!isState(parsed)) {
      return NextResponse.json({ state: seedScorecard(), seeded: true });
    }
    return NextResponse.json({ state: withIntervals(parsed), seeded: false });
  } catch {
    return NextResponse.json({ state: seedScorecard(), seeded: true, offline: true });
  }
}

export async function PUT(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const body = (await req.json().catch(() => null)) as { state?: unknown } | null;
  if (!body || !isState(body.state)) {
    return NextResponse.json({ error: "Invalid scorecard payload." }, { status: 400 });
  }

  const state = withIntervals(body.state);
  await ensureScorecardTable();
  const saved = await prisma.scorecardStore.upsert({
    where: { id: STORE_ID },
    create: {
      id: STORE_ID,
      location: state.location,
      payload: JSON.stringify(state),
    },
    update: {
      location: state.location,
      payload: JSON.stringify(state),
    },
  });

  return NextResponse.json({ ok: true, updatedAt: saved.updatedAt });
}
