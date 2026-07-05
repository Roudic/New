import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/password";
import { serializeInvite } from "@/lib/invites";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: { token: string } }
) {
  const invite = await prisma.teamInvite.findUnique({
    where: { token: params.token },
    include: { invitedBy: { select: { name: true } } },
  });

  if (!invite) {
    return NextResponse.json({ error: "Invite not found." }, { status: 404 });
  }

  const serialized = serializeInvite(invite);
  if (serialized.status === "accepted") {
    return NextResponse.json({ error: "This invite was already used." }, { status: 410 });
  }
  if (serialized.status === "expired") {
    return NextResponse.json({ error: "This invite has expired." }, { status: 410 });
  }

  return NextResponse.json({
    name: invite.name,
    email: invite.email,
    jobTitle: invite.jobTitle,
    role: invite.role,
    locationName: invite.locationName,
    invitedByName: invite.invitedBy.name,
    expiresAt: invite.expiresAt.toISOString(),
  });
}

export async function POST(
  request: Request,
  { params }: { params: { token: string } }
) {
  const body = await request.json();
  const password = String(body.password ?? "");
  const confirm = String(body.confirmPassword ?? "");

  if (password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters." },
      { status: 400 }
    );
  }

  if (password !== confirm) {
    return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
  }

  const invite = await prisma.teamInvite.findUnique({
    where: { token: params.token },
  });

  if (!invite) {
    return NextResponse.json({ error: "Invite not found." }, { status: 404 });
  }

  if (invite.acceptedAt) {
    return NextResponse.json({ error: "This invite was already used." }, { status: 410 });
  }

  if (invite.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "This invite has expired." }, { status: 410 });
  }

  const passwordHash = await hashPassword(password);

  const existing = await prisma.user.findUnique({ where: { email: invite.email } });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        name: invite.name,
        jobTitle: invite.jobTitle,
        role: invite.role,
        locationName: invite.locationName,
        passwordHash,
        isActive: true,
      },
    });
  } else {
    await prisma.user.create({
      data: {
        email: invite.email,
        name: invite.name,
        jobTitle: invite.jobTitle,
        role: invite.role,
        locationName: invite.locationName,
        passwordHash,
      },
    });
  }

  await prisma.teamInvite.update({
    where: { id: invite.id },
    data: { acceptedAt: new Date() },
  });

  return NextResponse.json({
    ok: true,
    message: "Account ready. You can sign in now.",
    email: invite.email,
  });
}
