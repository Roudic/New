import { authorize } from "./access";
import { classify } from "./classify";
import { destinationMatchesCategory } from "./file";
import { isLinkableDriveFile } from "./link";
import type {
  AccessRoster,
  CapturedNote,
  DriveFile,
  FilingDecision,
  KnowledgeLink,
  VerificationCheck,
  VerificationResult,
} from "./types";

function check(
  name: string,
  ok: boolean,
  detail: string,
  blocking = true
): VerificationCheck {
  return { name, ok, blocking, detail };
}

export function verifyFiling(input: {
  note: CapturedNote;
  decision: FilingDecision;
  links: KnowledgeLink[];
  catalog: DriveFile[];
  roster: AccessRoster;
}): VerificationResult {
  const { note, decision, links, catalog, roster } = input;
  const independent = classify(note.title, note.body);
  const catalogById = new Map(catalog.map((file) => [file.id, file]));

  const access = authorize(note.actorEmail, roster, "capture");
  const body = `${note.title} ${note.body}`.trim();

  const categoryAgrees =
    independent.category === decision.category ||
    (independent.category === "general" && decision.category === "general");

  const driveLinks = links.filter((link) => link.type === "drive-file");
  const invalidDriveLinks = driveLinks.filter((link) => {
    const file = catalogById.get(link.targetId);
    return !file || !isLinkableDriveFile(file);
  });

  const storeTeamAcl = links.some((link) => {
    const file = catalogById.get(link.targetId);
    return file?.visibility === "store-team" || file?.visibility === "public" || file?.visibility === "anyone-with-link";
  });

  const checks: VerificationCheck[] = [
    check(
      "actor-is-manager",
      access.ok,
      access.ok
        ? `actor ${access.email} is an active manager`
        : access.reason
    ),
    check(
      "body-not-empty",
      body.length > 0,
      body.length > 0 ? "note has content" : "empty notes cannot be filed"
    ),
    check(
      "independent-classify-agrees",
      categoryAgrees,
      categoryAgrees
        ? `independent classify is ${independent.category}`
        : `written category is ${decision.category} but independent classify is ${independent.category}`
    ),
    check(
      "destination-matches-category",
      destinationMatchesCategory(decision) && decision.noteId === note.id,
      destinationMatchesCategory(decision) && decision.noteId === note.id
        ? `destination ${decision.destination.driveFolder}`
        : `destination ${decision.destination.driveFolder} / ${decision.destination.localPath} does not match ${decision.category}`
    ),
    check(
      "drive-links-in-manager-catalog",
      invalidDriveLinks.length === 0,
      invalidDriveLinks.length === 0
        ? `${driveLinks.length} Drive link(s) are in the manager-only catalog`
        : `blocked Drive link(s): ${invalidDriveLinks.map((link) => link.targetId).join(", ")}`
    ),
    check(
      "no-store-team-drive-leak",
      !storeTeamAcl &&
        roster.driveFolder.anyoneWithLink === false &&
        roster.driveFolder.shareWithStoreTeam === false,
      storeTeamAcl
        ? "a linked Drive file is visible to the store team or anyone with the link"
        : "Drive policy stays restricted to the 4 managers"
    ),
  ];

  const warnings: string[] = [];
  if (decision.category !== "general" && decision.confidence < 0.55) {
    warnings.push("classification confidence is low — worth a manager glance");
  }

  const ok = checks.filter((item) => item.blocking).every((item) => item.ok);
  return { ok, checks, warnings };
}
