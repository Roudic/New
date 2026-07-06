import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { ensureJournalTables } from "@/lib/journal-db";
import { serializeEntry } from "@/lib/journal-serializers";
import type { JournalEntryDraft } from "@/lib/journal-types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  await ensureJournalTables();

  const { searchParams } = new URL(request.url);
  const notebookId = searchParams.get("notebookId");

  const entries = await prisma.journalEntry.findMany({
    where: {
      userId: auth.user.id,
      ...(notebookId ? { notebookId } : {}),
    },
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
    take: 500,
  });

  return NextResponse.json(entries.map(serializeEntry));
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  await ensureJournalTables();

  const body = (await request.json()) as JournalEntryDraft;
  if (!body.notebookId) {
    return NextResponse.json({ error: "notebookId is required" }, { status: 400 });
  }

  const notebook = await prisma.notebook.findFirst({
    where: { id: body.notebookId, userId: auth.user.id },
  });
  if (!notebook) {
    return NextResponse.json({ error: "Notebook not found" }, { status: 404 });
  }

  const entry = await prisma.journalEntry.create({
    data: {
      userId: auth.user.id,
      notebookId: notebook.id,
      title: body.title ?? "",
      content: body.content ?? "",
      tags: JSON.stringify(body.tags ?? []),
      entryDate: body.entryDate ? new Date(body.entryDate) : new Date(),
    },
  });

  return NextResponse.json(serializeEntry(entry), { status: 201 });
}
