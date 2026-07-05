import { randomBytes } from "crypto";

export function generateInviteToken(): string {
  return randomBytes(24).toString("hex");
}

export function getInviteExpiry(days = 7): Date {
  const expires = new Date();
  expires.setDate(expires.getDate() + days);
  return expires;
}

export function getInviteUrl(token: string): string {
  const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/invite/${token}`;
}

export function serializeInvite(invite: {
  id: string;
  email: string;
  name: string;
  jobTitle: string | null;
  role: string;
  locationName: string;
  token: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  createdAt: Date;
  invitedBy: { name: string };
}) {
  const expired = invite.expiresAt.getTime() < Date.now();
  const accepted = Boolean(invite.acceptedAt);

  return {
    id: invite.id,
    email: invite.email,
    name: invite.name,
    jobTitle: invite.jobTitle,
    role: invite.role,
    locationName: invite.locationName,
    token: invite.token,
    inviteUrl: getInviteUrl(invite.token),
    invitedByName: invite.invitedBy.name,
    expiresAt: invite.expiresAt.toISOString(),
    acceptedAt: invite.acceptedAt?.toISOString(),
    createdAt: invite.createdAt.toISOString(),
    status: accepted ? "accepted" : expired ? "expired" : "pending",
  };
}

export function generateTempPassword(): string {
  return `kitchen-${randomBytes(4).toString("hex")}`;
}
