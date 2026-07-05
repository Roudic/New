import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { serializeNotebook } from "@/lib/journal-serializers";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const existing = await prisma.notebook.findFirst({
    where: { id: params.id, userId: auth.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Notebook not found" }, { status: 404 });
  }

  const body = (await request.json()) as { name?: string; color?: string };
  const notebook = await prisma.notebook.update({
    where: { id: existing.id },
    data: {
      ...(body.name?.trim() ? { name: body.name.trim().slice(0, 60) } : {}),
      ...(body.color ? { color: body.color } : {}),
    },
    include: { _count: { select: { entries: true } } },
  });

  return NextResponse.json(serializeNotebook(notebook));
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const existing = await prisma.notebook.findFirst({
    where: { id: params.id, userId: auth.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Notebook not found" }, { status: 404 });
  }

  await prisma.notebook.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true });
}
