import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { ensureL10Tables } from "@/lib/l10/db";
import { serializeSession } from "@/lib/l10/serialize";
import { createL10Session, mostRecentPrevious, toPayload } from "@/lib/l10/session";
import type { CreateL10Input, L10Session } from "@/lib/l10/types";

export const dynamic = "force-dynamic";

async function listSessions(userId: string): Promise<L10Session[]> {
  const rows = await prisma.l10Session.findMany({
    where: { userId },
    orderBy: { scheduledAt: "desc" },
    take: 100,
  });
  return rows.map(serializeSession);
}

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  await ensureL10Tables();

  return NextResponse.json(await listSessions(auth.user.id));
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  await ensureL10Tables();

  const body = (await request.json().catch(() => ({}))) as CreateL10Input;
  const copyFromPrevious = body.copyFromPrevious !== false;
  const existing = await listSessions(auth.user.id);
  const previous = copyFromPrevious ? mostRecentPrevious(existing) : null;
  const session = createL10Session({
    title: body.title,
    scheduledAt: body.scheduledAt,
    location: body.location,
    previous,
  });

  const row = await prisma.l10Session.create({
    data: {
      id: session.id,
      userId: auth.user.id,
      title: session.title,
      scheduledAt: new Date(session.scheduledAt),
      location: session.location,
      status: session.status,
      rating: session.rating,
      payload: JSON.stringify(toPayload(session)),
    },
  });

  return NextResponse.json(serializeSession(row), { status: 201 });
}
