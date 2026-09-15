import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { MANAGER_COOKIE } from "@/lib/second-brain/manager-auth";

export const dynamic = "force-dynamic";

export async function POST() {
  cookies().set(MANAGER_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return NextResponse.json({ ok: true });
}
