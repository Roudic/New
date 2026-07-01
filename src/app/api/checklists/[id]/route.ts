import { NextResponse } from "next/server";
import { requireAdmin, requireUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { serializeTemplate } from "@/lib/serializers";
import type { ChecklistDraft } from "@/lib/types";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const template = await prisma.checklistTemplate.findUnique({
    where: { id: params.id },
    include: { items: true },
  });

  if (!template) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(serializeTemplate(template));
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const existing = await prisma.checklistTemplate.findUnique({
    where: { id: params.id },
  });

  if (!existing || existing.isBuiltIn) {
    return NextResponse.json({ error: "Cannot edit this template" }, { status: 403 });
  }

  const body = (await request.json()) as ChecklistDraft;

  await prisma.checklistItem.deleteMany({ where: { templateId: params.id } });

  const template = await prisma.checklistTemplate.update({
    where: { id: params.id },
    data: {
      name: body.name.trim(),
      description: body.description?.trim() ?? "",
      category: body.category,
      schedule: body.schedule,
      estimatedMinutes: body.estimatedMinutes ?? 15,
      items: {
        create: (body.items ?? []).map((item, index) => ({
          title: item.title,
          description: item.description,
          type: item.type,
          required: item.required,
          minTemp: item.minTemp,
          maxTemp: item.maxTemp,
          trainingNote: item.trainingNote,
          sortOrder: index,
        })),
      },
    },
    include: { items: true },
  });

  return NextResponse.json(serializeTemplate(template));
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const existing = await prisma.checklistTemplate.findUnique({
    where: { id: params.id },
  });

  if (!existing || existing.isBuiltIn) {
    return NextResponse.json({ error: "Cannot delete this template" }, { status: 403 });
  }

  await prisma.checklistTemplate.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
