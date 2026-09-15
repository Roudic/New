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
  "Fill a pending seat (4 seats max). The seat stays pending-invite until Drive share is confirmed:",
  "npx tsx scripts/second-brain.ts grant --actor vinziant@gmail.com --name \"Full Name\" --email \"name@example.com\"",
  "Share the Drive folder \"CFA Hueytown Managers — Second Brain\" with that same Google account as Editor.",
  "Do not use Anyone with the link, the whole store, or a crew/team group. Restricted to the 4 manager accounts only.",
  "confirm-share cannot activate a seat until live Drive ACL is wired. A folder id in JSON is not proof of share.",
] as const;

export const DRIVE_ACL_UNWIRED =
  "Live Drive ACL is not wired. A Drive folder id in JSON is not proof of share. Seats stay pending except Joshua (operator exception).";

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
        driveShareConfirmed: true,
      },
      {
        seat: 2,
        id: "manager-seat-2",
        name: null,
        email: null,
        status: "pending-invite",
        driveShareConfirmed: false,
      },
      {
        seat: 3,
        id: "manager-seat-3",
        name: null,
        email: null,
        status: "pending-invite",
        driveShareConfirmed: false,
      },
      {
        seat: 4,
        id: "manager-seat-4",
        name: null,
        email: null,
        status: "pending-invite",
        driveShareConfirmed: false,
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
  const emails: string[] = [];
  for (const seat of roster.managers) {
    if (seat.status === "active" && seat.email) {
      emails.push(normalizeEmail(seat.email));
    }
  }
  return emails;
}

/** Granted seats (active or pending-invite) with an email. Not store-team. */
export function isGrantedManagerEmail(
  roster: AccessRoster,
  email: string | null | undefined
): boolean {
  const normalized = normalizeEmail(email);
  if (!normalized || isStoreTeamEmail(normalized)) return false;
  const seat = findManagerSeat(roster, normalized);
  return Boolean(seat?.email);
}

export function authorize(
  email: string | null | undefined,
  roster: AccessRoster,
  action: AccessAction
): AccessDecision {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    return {
      ok: false,
      email: "",
      code: "empty-email",
      reason: `An email is required to ${action}. Second Brain access is manager-only.`,
    };
  }

  if (isStoreTeamEmail(normalized)) {
    return {
      ok: false,
      email: normalized,
      code: "store-team-denied",
      reason: `Store team and JoltCheck employee/admin accounts cannot ${action} on Second Brain. Manager-only (4 seats).`,
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

  if (seat.status !== "active" || !seat.driveShareConfirmed) {
    return {
      ok: false,
      email: normalized,
      code: "pending-seat",
      reason: `This manager seat is pending invite. Finish grant + confirmed Drive share before they can ${action}.`,
      seat,
    };
  }

  return {
    ok: true,
    email: normalized,
    code: "ok",
    reason: `Active manager (${action})`,
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
          status: "pending-invite" as const,
          driveShareConfirmed: false,
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

export function confirmDriveShare(
  roster: AccessRoster,
  actorEmail: string,
  managerEmail: string
): { ok: true; roster: AccessRoster; seat: ManagerSeat } | { ok: false; error: string } {
  const actor = authorize(actorEmail, roster, "confirm-share");
  if (!actor.ok) {
    return { ok: false, error: actor.reason };
  }

  const email = normalizeEmail(managerEmail);
  if (!isGrantedManagerEmail(roster, email)) {
    return { ok: false, error: "That email does not have a granted manager seat." };
  }

  return { ok: false, error: DRIVE_ACL_UNWIRED };
}

export function driveSharePlan(roster: AccessRoster): {
  folderName: string;
  folderId: string | null;
  live: boolean;
  anyoneWithLink: false;
  shareWithStoreTeam: false;
  shareWith: { email: string; name: string; role: "writer" }[];
  awaitingDriveShare: ManagerSeat[];
  pending: ManagerSeat[];
  doNotShareWith: string[];
} {
  const shareWith: { email: string; name: string; role: "writer" }[] = [];
  const awaitingDriveShare: ManagerSeat[] = [];
  const pending: ManagerSeat[] = [];

  for (const seat of roster.managers) {
    if (seat.status === "active" && seat.email && seat.name && seat.driveShareConfirmed) {
      shareWith.push({
        email: normalizeEmail(seat.email),
        name: seat.name,
        role: "writer",
      });
      continue;
    }
    if (seat.email) {
      awaitingDriveShare.push(seat);
    } else {
      pending.push(seat);
    }
  }

  return {
    folderName: roster.driveFolder.name,
    folderId: roster.driveFolder.id,
    live: false,
    anyoneWithLink: false,
    shareWithStoreTeam: false,
    shareWith,
    awaitingDriveShare,
    pending,
    doNotShareWith: STORE_TEAM_DENYLIST.slice(),
  };
}
