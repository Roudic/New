import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authorize } from "@/lib/second-brain/access";
import {
  MANAGER_COOKIE,
  resolveBrainActor,
  type ManagerLoginResult,
} from "@/lib/second-brain/manager-auth";
import { withBrainStore } from "@/lib/second-brain/server-store";
import type { AccessAction } from "@/lib/second-brain/types";
import type { BrainStore } from "@/lib/second-brain/store";

export function loginFailed(result: ManagerLoginResult): NextResponse {
  const status = result.code === "password-not-configured" ? 503 : 401;
  return NextResponse.json(
    { error: result.reason, code: result.code },
    { status }
  );
}

export async function withManagerStore<T>(
  action: AccessAction,
  fn: (ctx: { email: string; store: BrainStore }) => T | Promise<T>
): Promise<T | NextResponse> {
  const email = resolveBrainActor(cookies().get(MANAGER_COOKIE)?.value);
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return withBrainStore(async (store) => {
    const access = authorize(email, store.getRoster(), action);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.reason, code: access.code },
        { status: 403 }
      );
    }
    return fn({ email: access.email, store });
  });
}
