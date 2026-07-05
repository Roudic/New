import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { hashPassword } from "@/lib/password";
import { generateTempPassword } from "@/lib/invites";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const roleFilter = searchParams.get("role");

  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      ...(roleFilter === "ADMIN" || roleFilter === "EMPLOYEE"
        ? { role: roleFilter }
        : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      jobTitle: true,
      locationName: true,
      createdAt: true,
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(users);
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const email = String(body.email ?? "").toLowerCase().trim();
  const name = String(body.name ?? "").trim();
  const jobTitle = body.jobTitle?.trim() || null;
  const role = body.role === "ADMIN" ? "ADMIN" : "EMPLOYEE";
  const locationName =
    body.locationName?.trim() || auth.user.locationName || "Main Street Kitchen";
  const password = body.password?.trim() || generateTempPassword();

  if (!email || !name) {
    return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "A user with this email already exists." }, { status: 409 });
  }

  const user = await prisma.user.create({
    data: {
      email,
      name,
      jobTitle,
      role,
      locationName,
      passwordHash: await hashPassword(password),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      jobTitle: true,
      locationName: true,
    },
  });

  return NextResponse.json(
    {
      user,
      tempPassword: body.password ? undefined : password,
      message: "Team member created. Share the login details with them.",
    },
    { status: 201 }
  );
}
