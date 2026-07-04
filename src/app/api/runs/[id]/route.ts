import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { serializeRun } from "@/lib/serializers";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const run = await prisma.checklistRun.findUnique({
    where: { id: params.id },
    include: {
      completions: true,
      template: { include: { items: true } },
      user: { select: { id: true, name: true } },
    },
  });

  if (!run) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (auth.user.role !== "ADMIN" && run.userId !== auth.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const serialized = serializeRun(run);
  return NextResponse.json({
    ...serialized,
    startedBy: run.user.name,
  });
}
