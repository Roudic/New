import { NextResponse } from "next/server";
import { requireAdmin, requireUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { serializeAssignment } from "@/lib/serializers";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const where =
    auth.user.role === "ADMIN"
      ? {}
      : { assignedToId: auth.user.id };

  const assignments = await prisma.assignment.findMany({
    where,
    include: {
      template: { include: { items: true } },
      assignedTo: {
        select: { id: true, name: true, email: true, locationName: true },
      },
      assignedBy: { select: { id: true, name: true } },
      runs: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(assignments.map(serializeAssignment));
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const { templateId, assignedToId, dueDate, notes } = body;

  if (!templateId || !assignedToId) {
    return NextResponse.json(
      { error: "templateId and assignedToId are required" },
      { status: 400 }
    );
  }

  const assignment = await prisma.assignment.create({
    data: {
      templateId,
      assignedToId,
      assignedById: auth.user.id,
      dueDate: dueDate ? new Date(dueDate) : null,
      notes: notes?.trim() || null,
    },
    include: {
      template: { include: { items: true } },
      assignedTo: {
        select: { id: true, name: true, email: true, locationName: true },
      },
      assignedBy: { select: { id: true, name: true } },
      runs: true,
    },
  });

  return NextResponse.json(serializeAssignment(assignment), { status: 201 });
}
