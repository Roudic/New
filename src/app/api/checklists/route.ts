import { NextResponse } from "next/server";
import { requireAdmin, requireUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { serializeTemplate } from "@/lib/serializers";
import type { ChecklistDraft } from "@/lib/types";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const templates = await prisma.checklistTemplate.findMany({
    include: { items: true },
    orderBy: [{ isBuiltIn: "desc" }, { name: "asc" }],
  });

  return NextResponse.json(templates.map(serializeTemplate));
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = (await request.json()) as ChecklistDraft;

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const template = await prisma.checklistTemplate.create({
    data: {
      name: body.name.trim(),
      description: body.description?.trim() ?? "",
      category: body.category,
      schedule: body.schedule,
      estimatedMinutes: body.estimatedMinutes ?? 15,
      isBuiltIn: false,
      createdById: auth.user.id,
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

  return NextResponse.json(serializeTemplate(template), { status: 201 });
}
