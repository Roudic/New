import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authenticateManager, MANAGER_COOKIE, signManagerSession } from "@/lib/second-brain/manager-auth";
import { loginFailed } from "@/lib/second-brain/require-manager";
import { withBrainStore } from "@/lib/second-brain/server-store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    email?: string;
    password?: string;
  };

  const result = await withBrainStore((store) =>
    authenticateManager(body.email ?? "", body.password ?? "", store.getRoster())
  );

  if (!result.ok) {
    return loginFailed(result);
  }

  cookies().set(MANAGER_COOKIE, signManagerSession(result.email), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    secure: process.env.NODE_ENV === "production",
  });

  return NextResponse.json({ ok: true, email: result.email });
}
