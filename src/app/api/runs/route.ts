import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { serializeRun } from "@/lib/serializers";

export async function POST(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const { assignmentId, templateId } = body;

  if (!assignmentId && !templateId) {
    return NextResponse.json(
      { error: "assignmentId or templateId required" },
      { status: 400 }
    );
  }

  let resolvedTemplateId = templateId as string | undefined;
  let resolvedAssignmentId = assignmentId as string | undefined;
  let userId = auth.user.id;

  if (assignmentId) {
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    if (
      auth.user.role !== "ADMIN" &&
      assignment.assignedToId !== auth.user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    resolvedTemplateId = assignment.templateId;
    resolvedAssignmentId = assignment.id;
    userId = assignment.assignedToId;

    const existingRun = await prisma.checklistRun.findFirst({
      where: {
        assignmentId: assignment.id,
        status: "IN_PROGRESS",
      },
      include: {
        completions: true,
        template: { include: { items: true } },
        user: true,
      },
    });

    if (existingRun) {
      return NextResponse.json(serializeRun(existingRun));
    }

    await prisma.assignment.update({
      where: { id: assignment.id },
      data: { status: "IN_PROGRESS" },
    });
  }

  const run = await prisma.checklistRun.create({
    data: {
      templateId: resolvedTemplateId!,
      userId,
      assignmentId: resolvedAssignmentId,
    },
    include: {
      completions: true,
      template: { include: { items: true } },
    },
  });

  return NextResponse.json(serializeRun(run), { status: 201 });
}

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const where =
    auth.user.role === "ADMIN" ? {} : { userId: auth.user.id };

  const runs = await prisma.checklistRun.findMany({
    where,
    include: {
      completions: true,
      template: { include: { items: true } },
    },
    orderBy: { startedAt: "desc" },
    take: 50,
  });

  return NextResponse.json(runs.map(serializeRun));
}
