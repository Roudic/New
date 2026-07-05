import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import {
  generateInviteToken,
  getInviteExpiry,
  serializeInvite,
} from "@/lib/invites";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const invites = await prisma.teamInvite.findMany({
    where: { acceptedAt: null },
    include: { invitedBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(invites.map(serializeInvite));
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

  if (!email || !name) {
    return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser?.isActive) {
    return NextResponse.json(
      { error: "This person already has an account. They can sign in directly." },
      { status: 409 }
    );
  }

  const pendingInvite = await prisma.teamInvite.findFirst({
    where: { email, acceptedAt: null, expiresAt: { gt: new Date() } },
  });

  if (pendingInvite) {
    return NextResponse.json({
      ...serializeInvite({
        ...pendingInvite,
        invitedBy: { name: auth.user.name ?? "Manager" },
      }),
      message: "An active invite already exists for this email.",
    });
  }

  const token = generateInviteToken();
  const invite = await prisma.teamInvite.create({
    data: {
      email,
      name,
      jobTitle,
      role,
      locationName,
      token,
      invitedById: auth.user.id,
      expiresAt: getInviteExpiry(),
    },
    include: { invitedBy: { select: { name: true } } },
  });

  return NextResponse.json(
    {
      ...serializeInvite(invite),
      message: "Invite created. Share the link with your team member.",
    },
    { status: 201 }
  );
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Invite id is required." }, { status: 400 });
  }

  const invite = await prisma.teamInvite.findUnique({ where: { id } });

  if (!invite) {
    return NextResponse.json({ error: "Invite not found." }, { status: 404 });
  }

  if (invite.acceptedAt) {
    return NextResponse.json({ error: "This invite was already accepted." }, { status: 400 });
  }

  await prisma.teamInvite.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
