import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { OPERATOR_EMAIL } from "@/lib/second-brain/access";
import { BRAIN_LOGIN_ENABLED } from "@/lib/second-brain/brain-login";
import {
  authenticateManager,
  MANAGER_COOKIE,
  managerCookieOptions,
  signManagerSession,
} from "@/lib/second-brain/manager-auth";
import { loginFailed } from "@/lib/second-brain/require-manager";
import { withBrainStore } from "@/lib/second-brain/server-store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!BRAIN_LOGIN_ENABLED) {
    return NextResponse.json({ ok: true, email: OPERATOR_EMAIL });
  }

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

  cookies().set(
    MANAGER_COOKIE,
    signManagerSession(result.email),
    managerCookieOptions(60 * 60 * 24 * 7)
  );

  return NextResponse.json({ ok: true, email: result.email });
}
