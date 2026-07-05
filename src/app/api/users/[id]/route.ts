import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const user = await prisma.user.findUnique({ where: { id: params.id } });

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  if (user.id === auth.user.id && body.isActive === false) {
    return NextResponse.json({ error: "You cannot deactivate your own account." }, { status: 400 });
  }

  const data: {
    name?: string;
    jobTitle?: string | null;
    role?: string;
    locationName?: string;
    isActive?: boolean;
    passwordHash?: string;
  } = {};

  if (body.name?.trim()) data.name = body.name.trim();
  if ("jobTitle" in body) data.jobTitle = body.jobTitle?.trim() || null;
  if (body.role === "ADMIN" || body.role === "EMPLOYEE") data.role = body.role;
  if (body.locationName?.trim()) data.locationName = body.locationName.trim();
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;
  if (body.password?.trim()) {
    data.passwordHash = await hashPassword(body.password.trim());
  }

  const updated = await prisma.user.update({
    where: { id: params.id },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      jobTitle: true,
      locationName: true,
      isActive: true,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  if (params.id === auth.user.id) {
    return NextResponse.json({ error: "You cannot remove your own account." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: params.id } });
  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  await prisma.user.update({
    where: { id: params.id },
    data: { isActive: false },
  });

  return NextResponse.json({ ok: true });
}
