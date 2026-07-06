import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { ensureJournalTables } from "@/lib/journal-db";
import { serializeEntry } from "@/lib/journal-serializers";
import type { JournalEntryDraft } from "@/lib/journal-types";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  await ensureJournalTables();

  const existing = await prisma.journalEntry.findFirst({
    where: { id: params.id, userId: auth.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  const body = (await request.json()) as JournalEntryDraft;

  if (body.notebookId && body.notebookId !== existing.notebookId) {
    const notebook = await prisma.notebook.findFirst({
      where: { id: body.notebookId, userId: auth.user.id },
    });
    if (!notebook) {
      return NextResponse.json({ error: "Notebook not found" }, { status: 404 });
    }
  }

  const entry = await prisma.journalEntry.update({
    where: { id: existing.id },
    data: {
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.content !== undefined ? { content: body.content } : {}),
      ...(body.tags !== undefined ? { tags: JSON.stringify(body.tags) } : {}),
      ...(body.mood !== undefined ? { mood: body.mood } : {}),
      ...(body.pinned !== undefined ? { pinned: body.pinned } : {}),
      ...(body.notebookId !== undefined ? { notebookId: body.notebookId } : {}),
      ...(body.entryDate !== undefined
        ? { entryDate: new Date(body.entryDate) }
        : {}),
    },
  });

  return NextResponse.json(serializeEntry(entry));
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  await ensureJournalTables();

  const existing = await prisma.journalEntry.findFirst({
    where: { id: params.id, userId: auth.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  await prisma.journalEntry.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true });
}
