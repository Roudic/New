import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { ensureJournalTables } from "@/lib/journal-db";
import { serializeNotebook } from "@/lib/journal-serializers";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  await ensureJournalTables();

  const notebooks = await prisma.notebook.findMany({
    where: { userId: auth.user.id },
    include: { _count: { select: { entries: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(notebooks.map(serializeNotebook));
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  await ensureJournalTables();

  const body = (await request.json()) as { name?: string; color?: string };
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const notebook = await prisma.notebook.create({
    data: {
      userId: auth.user.id,
      name: body.name.trim().slice(0, 60),
      color: body.color ?? "blue",
    },
    include: { _count: { select: { entries: true } } },
  });

  return NextResponse.json(serializeNotebook(notebook), { status: 201 });
}
