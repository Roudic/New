import { NextResponse } from "next/server";
import {
  MANAGER_COOKIE,
  MANAGER_COOKIE_PATH,
  managerCookieOptions,
} from "@/lib/second-brain/manager-auth";

export const dynamic = "force-dynamic";

function expireCookie(path: string): string {
  const attrs = managerCookieOptions(0, path);
  const parts = [
    `${MANAGER_COOKIE}=`,
    `Path=${attrs.path}`,
    "Max-Age=0",
    "HttpOnly",
    `SameSite=${attrs.sameSite}`,
  ];
  if (attrs.secure) parts.push("Secure");
  return parts.join("; ");
}

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.headers.append("Set-Cookie", expireCookie(MANAGER_COOKIE_PATH));
  res.headers.append("Set-Cookie", expireCookie("/"));
  return res;
}
