import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { ensureL10Tables } from "@/lib/l10/db";
import { serializeSession } from "@/lib/l10/serialize";
import { applyDraft, isL10Status, toPayload } from "@/lib/l10/session";
import type { L10SessionDraft } from "@/lib/l10/types";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  await ensureL10Tables();

  const row = await prisma.l10Session.findFirst({
    where: { id: params.id, userId: auth.user.id },
  });
  if (!row) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json(serializeSession(row));
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  await ensureL10Tables();

  const existing = await prisma.l10Session.findFirst({
    where: { id: params.id, userId: auth.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const body = (await request.json()) as L10SessionDraft;
  if (body.status !== undefined && !isL10Status(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const current = serializeSession(existing);
  const next = applyDraft(current, body);

  const row = await prisma.l10Session.update({
    where: { id: existing.id },
    data: {
      title: next.title,
      scheduledAt: new Date(next.scheduledAt),
      location: next.location,
      status: next.status,
      rating: next.rating,
      payload: JSON.stringify(toPayload(next)),
    },
  });

  return NextResponse.json(serializeSession(row));
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  await ensureL10Tables();

  const existing = await prisma.l10Session.findFirst({
    where: { id: params.id, userId: auth.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  await prisma.l10Session.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true });
}
