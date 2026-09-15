import type {
  AccessAction,
  AccessDecision,
  AccessRoster,
  ManagerSeat,
} from "./types";

export const MAX_MANAGER_SEATS = 4 as const;

export const OPERATOR_EMAIL = "vinziant@gmail.com";
export const OPERATOR_NAME = "Joshua Vinziant";

/**
 * JoltCheck / store-team identities that must never inherit Second Brain access.
 * This brain is manager-only and is not the employee checklist app.
 */
export const STORE_TEAM_DENYLIST = [
  "alex@store.com",
  "sam@store.com",
  "admin@joltcheck.com",
] as const;

export const PENDING_ACCESS_STEPS = [
  "An active manager (today: Joshua Vinziant) sends the person's name and Google/work email.",
  "Fill a pending seat (4 seats max): npx tsx scripts/second-brain.ts grant --actor vinziant@gmail.com --name \"Full Name\" --email \"name@example.com\"",
  "Share the Drive folder \"CFA Hueytown Managers — Second Brain\" with that same Google account as Editor.",
  "Do not use Anyone with the link, the whole store, or a crew/team group. Restricted to the 4 manager accounts only.",
  "That manager can then drop a note, voice memo, or link into the shared Inbox. The agent classifies, files, verifies, and links it.",
] as const;

export function normalizeEmail(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

export function defaultRoster(): AccessRoster {
  return {
    location: "Chick-fil-A Hueytown",
    maxSeats: MAX_MANAGER_SEATS,
    driveFolder: {
      name: "CFA Hueytown Managers — Second Brain",
      id: null,
      visibility: "restricted",
      anyoneWithLink: false,
      shareWithStoreTeam: false,
    },
    managers: [
      {
        seat: 1,
        id: "joshua-vinziant",
        name: OPERATOR_NAME,
        email: OPERATOR_EMAIL,
        status: "active",
      },
      {
        seat: 2,
        id: "manager-seat-2",
        name: null,
        email: null,
        status: "pending-invite",
      },
      {
        seat: 3,
        id: "manager-seat-3",
        name: null,
        email: null,
        status: "pending-invite",
      },
      {
        seat: 4,
        id: "manager-seat-4",
        name: null,
        email: null,
        status: "pending-invite",
      },
    ],
    howPendingManagersGetAccess: [...PENDING_ACCESS_STEPS],
  };
}

export function isStoreTeamEmail(email: string): boolean {
  return (STORE_TEAM_DENYLIST as readonly string[]).includes(normalizeEmail(email));
}

export function findManagerSeat(
  roster: AccessRoster,
  email: string
): ManagerSeat | undefined {
  const normalized = normalizeEmail(email);
  if (!normalized) return undefined;
  return roster.managers.find(
    (seat) => seat.email !== null && normalizeEmail(seat.email) === normalized
  );
}

export function activeManagerEmails(roster: AccessRoster): string[] {
  return roster.managers
    .filter((seat) => seat.status === "active" && seat.email)
    .map((seat) => normalizeEmail(seat.email));
}

export function authorize(
  email: string | null | undefined,
  roster: AccessRoster,
  _action: AccessAction
): AccessDecision {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    return {
      ok: false,
      email: "",
      code: "empty-email",
      reason: "An email is required. Second Brain access is manager-only.",
    };
  }

  if (isStoreTeamEmail(normalized)) {
    return {
      ok: false,
      email: normalized,
      code: "store-team-denied",
      reason:
        "Store team and JoltCheck employee/admin accounts cannot use Second Brain. Manager-only (4 seats).",
    };
  }

  if (roster.maxSeats !== MAX_MANAGER_SEATS || roster.managers.length !== 4) {
    return {
      ok: false,
      email: normalized,
      code: "not-a-manager",
      reason: "Access roster is invalid. Exactly 4 manager seats are required.",
    };
  }

  if (roster.driveFolder.anyoneWithLink || roster.driveFolder.shareWithStoreTeam) {
    return {
      ok: false,
      email: normalized,
      code: "not-a-manager",
      reason:
        "Drive folder policy is not manager-restricted. Refusing access until Anyone-with-link and store-team sharing are off.",
    };
  }

  const seat = findManagerSeat(roster, normalized);
  if (!seat) {
    return {
      ok: false,
      email: normalized,
      code: "not-a-manager",
      reason:
        "Not on the 4-manager allowlist. Crew accounts are not added automatically.",
    };
  }

  if (seat.status !== "active") {
    return {
      ok: false,
      email: normalized,
      code: "pending-seat",
      reason:
        "This manager seat is pending invite. Finish grant + Drive share before they can capture or read.",
      seat,
    };
  }

  return {
    ok: true,
    email: normalized,
    code: "ok",
    reason: "Active manager",
    seat,
  };
}

export function assertAuthorized(
  email: string | null | undefined,
  roster: AccessRoster,
  action: AccessAction
): AccessDecision {
  const decision = authorize(email, roster, action);
  if (!decision.ok) {
    throw new Error(decision.reason);
  }
  return decision;
}

export function grantManagerSeat(
  roster: AccessRoster,
  actorEmail: string,
  incoming: { name: string; email: string }
): { ok: true; roster: AccessRoster; seat: ManagerSeat } | { ok: false; error: string } {
  const actor = authorize(actorEmail, roster, "grant");
  if (!actor.ok) {
    return { ok: false, error: actor.reason };
  }

  const name = incoming.name.trim();
  const email = normalizeEmail(incoming.email);
  if (!name || !email || !email.includes("@")) {
    return { ok: false, error: "Name and a valid email are required to fill a manager seat." };
  }

  if (isStoreTeamEmail(email)) {
    return {
      ok: false,
      error:
        "Refusing to grant Second Brain access to a store-team / JoltCheck account. Managers only.",
    };
  }

  const existing = findManagerSeat(roster, email);
  if (existing) {
    return { ok: false, error: "That email already has a manager seat." };
  }

  const pendingIndex = roster.managers.findIndex(
    (seat) => seat.status === "pending-invite" && !seat.email
  );
  if (pendingIndex === -1) {
    return {
      ok: false,
      error: `All ${MAX_MANAGER_SEATS} manager seats are filled. Do not expand beyond the 4 managers.`,
    };
  }

  const nextManagers = roster.managers.map((seat, index) =>
    index === pendingIndex
      ? {
          ...seat,
          name,
          email,
          status: "active" as const,
        }
      : seat
  ) as AccessRoster["managers"];

  const next: AccessRoster = {
    ...roster,
    maxSeats: MAX_MANAGER_SEATS,
    managers: nextManagers,
    driveFolder: {
      ...roster.driveFolder,
      visibility: "restricted",
      anyoneWithLink: false,
      shareWithStoreTeam: false,
    },
  };

  return { ok: true, roster: next, seat: next.managers[pendingIndex] };
}

export function driveSharePlan(roster: AccessRoster): {
  folderName: string;
  anyoneWithLink: false;
  shareWithStoreTeam: false;
  shareWith: { email: string; name: string; role: "writer" }[];
  pending: ManagerSeat[];
  doNotShareWith: string[];
} {
  return {
    folderName: roster.driveFolder.name,
    anyoneWithLink: false,
    shareWithStoreTeam: false,
    shareWith: roster.managers
      .filter((seat) => seat.status === "active" && seat.email && seat.name)
      .map((seat) => ({
        email: normalizeEmail(seat.email),
        name: seat.name as string,
        role: "writer" as const,
      })),
    pending: roster.managers.filter((seat) => seat.status === "pending-invite"),
    doNotShareWith: [...STORE_TEAM_DENYLIST],
  };
}
