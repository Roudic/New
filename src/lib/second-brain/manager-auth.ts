import { createHmac, timingSafeEqual } from "node:crypto";
import { authorize, isStoreTeamEmail, normalizeEmail } from "./access";
import type { AccessDecision, AccessRoster } from "./types";

export const MANAGER_COOKIE = "second_brain_manager";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type ManagerLoginCode =
  | AccessDecision["code"]
  | "invalid-credentials"
  | "password-not-configured";

export interface ManagerLoginResult {
  ok: boolean;
  email: string;
  code: ManagerLoginCode;
  reason: string;
}

function secret(): string {
  return (
    process.env.SECOND_BRAIN_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    ""
  );
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

  if (isStoreTeamEmail(normalized)) {
    return {
      ok: false,
      email: normalized,
      code: "store-team-denied",
      reason:
        "Store team and JoltCheck accounts cannot use the manager dashboard.",
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
    return {
      ok: false,
      email: normalized,
      code: "invalid-credentials",
      reason: "Invalid email or password.",
    };
  }

  const access = authorize(normalized, roster, "capture");
  if (!access.ok) {
    return {
      ok: false,
      email: normalized,
      code: access.code,
      reason: access.reason,
    };
  }

  return {
    ok: true,
    email: access.email,
    code: "ok",
    reason: "Active manager",
  };
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
