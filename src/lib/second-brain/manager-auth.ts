import { createHmac, timingSafeEqual } from "node:crypto";
import { authorize, normalizeEmail } from "./access";
import type { AccessRoster } from "./types";

export const MANAGER_COOKIE = "second_brain_manager";
export const MANAGER_COOKIE_PATH = "/brain";
export const INVALID_CREDENTIALS_REASON = "Invalid email or password.";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type ManagerLoginCode =
  | "ok"
  | "empty-email"
  | "invalid-credentials"
  | "pending-seat"
  | "password-not-configured";

export interface ManagerLoginResult {
  ok: boolean;
  email: string;
  code: ManagerLoginCode;
  reason: string;
}

function secret(): string {
  return (process.env.SECOND_BRAIN_SECRET ?? "").trim();
}

function configuredPassword(): string {
  return (process.env.SECOND_BRAIN_PASSWORD ?? "").trim();
}

function hmac(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    const dummy = Buffer.alloc(left.length);
    timingSafeEqual(left, dummy);
    return false;
  }
  return timingSafeEqual(left, right);
}

function invalidCredentials(email: string): ManagerLoginResult {
  return {
    ok: false,
    email,
    code: "invalid-credentials",
    reason: INVALID_CREDENTIALS_REASON,
  };
}

export function authenticateManager(
  email: string,
  password: string,
  roster: AccessRoster
): ManagerLoginResult {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    return {
      ok: false,
      email: "",
      code: "empty-email",
      reason: "An email is required. Second Brain is manager-only.",
    };
  }

  const expected = configuredPassword();
  if (!expected || !secret()) {
    return {
      ok: false,
      email: normalized,
      code: "password-not-configured",
      reason: "Manager dashboard password is not configured on the server.",
    };
  }

  if (!safeEqual(password, expected)) {
    return invalidCredentials(normalized);
  }

  const access = authorize(normalized, roster, "capture");
  if (access.ok) {
    return {
      ok: true,
      email: access.email,
      code: "ok",
      reason: "Active manager",
    };
  }

  if (access.code === "pending-seat") {
    return {
      ok: false,
      email: normalized,
      code: "pending-seat",
      reason: access.reason,
    };
  }

  return invalidCredentials(normalized);
}

export function signManagerSession(email: string, now = Date.now()): string {
  const payload = Buffer.from(
    JSON.stringify({ email: normalizeEmail(email), exp: now + SESSION_TTL_MS }),
    "utf8"
  ).toString("base64url");
  return `${payload}.${hmac(payload)}`;
}

export function readManagerSession(
  token: string | undefined,
  now = Date.now()
): string | null {
  if (!token || !secret()) return null;
  const splitAt = token.lastIndexOf(".");
  if (splitAt <= 0) return null;
  const payload = token.slice(0, splitAt);
  const sig = token.slice(splitAt + 1);
  if (!safeEqual(sig, hmac(payload))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      email?: string;
      exp?: number;
    };
    if (!parsed.email || !parsed.exp || parsed.exp < now) return null;
    return normalizeEmail(parsed.email);
  } catch {
    return null;
  }
}

export function managerCookieOptions(maxAge: number, path = MANAGER_COOKIE_PATH) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path,
    maxAge,
    secure: process.env.NODE_ENV === "production",
  };
}
