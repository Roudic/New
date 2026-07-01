import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { serializeRun } from "@/lib/serializers";

function stringifyValue(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const run = await prisma.checklistRun.findUnique({
    where: { id: params.id },
    include: {
      completions: true,
      template: { include: { items: true } },
      assignment: true,
    },
  });

  if (!run) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (auth.user.role !== "ADMIN" && run.userId !== auth.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { itemId, value, photoDataUrl, notes } = body;

  await prisma.taskCompletion.deleteMany({
    where: { runId: run.id, itemId },
  });

  await prisma.taskCompletion.create({
    data: {
      runId: run.id,
      itemId,
      completedById: auth.user.id,
      value: stringifyValue(value),
      photoDataUrl: photoDataUrl ?? null,
      notes: notes ?? null,
    },
  });

  const updated = await prisma.checklistRun.findUnique({
    where: { id: run.id },
    include: {
      completions: true,
      template: { include: { items: true } },
    },
  });

  if (!updated) {
    return NextResponse.json({ error: "Run missing" }, { status: 500 });
  }

  const required = updated.template.items.filter((i) => i.required);
  const targets = required.length ? required : updated.template.items;
  const done = new Set(updated.completions.map((c) => c.itemId));
  const complete = targets.every((item) => done.has(item.id));

  if (complete) {
    await prisma.checklistRun.update({
      where: { id: run.id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });

    if (run.assignmentId) {
      await prisma.assignment.update({
        where: { id: run.assignmentId },
        data: { status: "COMPLETED" },
      });
    }
  }

  const finalRun = await prisma.checklistRun.findUnique({
    where: { id: run.id },
    include: {
      completions: true,
      template: { include: { items: true } },
    },
  });

  return NextResponse.json(serializeRun(finalRun!));
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const run = await prisma.checklistRun.findUnique({
    where: { id: params.id },
  });

  if (!run) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (auth.user.role !== "ADMIN" && run.userId !== auth.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get("itemId");
  if (!itemId) {
    return NextResponse.json({ error: "itemId required" }, { status: 400 });
  }

  await prisma.taskCompletion.deleteMany({
    where: { runId: run.id, itemId },
  });

  await prisma.checklistRun.update({
    where: { id: run.id },
    data: { status: "IN_PROGRESS", completedAt: null },
  });

  if (run.assignmentId) {
    await prisma.assignment.update({
      where: { id: run.assignmentId },
      data: { status: "IN_PROGRESS" },
    });
  }

  const updated = await prisma.checklistRun.findUnique({
    where: { id: run.id },
    include: {
      completions: true,
      template: { include: { items: true } },
    },
  });

  return NextResponse.json(serializeRun(updated!));
}
