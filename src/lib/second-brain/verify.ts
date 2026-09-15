import { isGrantedManagerEmail } from "./access";
import { reviewClassify, VERIFY_MIN_CONFIDENCE } from "./classify";
import { destinationMatchesCategory } from "./file";
import { isLinkableDriveFile, isSimulatedDriveFile } from "./link";
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
  const secondScorer = reviewClassify(note.title, note.body);
  const catalogById = new Map(catalog.map((file) => [file.id, file]));

  const accessOk = isGrantedManagerEmail(roster, note.actorEmail);
  const body = `${note.title} ${note.body}`.trim();

  const categoryAgrees = secondScorer.category === decision.category;

  const driveLinks = links.filter((link) => link.type === "drive-file");
  const invalidDriveLinks = driveLinks.filter((link) => {
    const file = catalogById.get(link.targetId);
    return !file || !isLinkableDriveFile(file);
  });
  const simulatedDriveLinks = driveLinks.filter((link) => {
    const file = catalogById.get(link.targetId);
    return !file || isSimulatedDriveFile(file);
  });

  const storeTeamAcl = links.some((link) => {
    const file = catalogById.get(link.targetId);
    return (
      file?.visibility === "store-team" ||
      file?.visibility === "public" ||
      file?.visibility === "anyone-with-link"
    );
  });

  const driveConfigured = Boolean(roster.driveFolder.id);
  const driveLinksAllowed = driveConfigured && simulatedDriveLinks.length === 0;

  const checks: VerificationCheck[] = [
    check(
      "actor-is-manager",
      accessOk,
      accessOk
        ? `actor ${note.actorEmail} is a granted manager`
        : "actor is not a granted manager on the 4-seat roster"
    ),
    check(
      "body-not-empty",
      body.length > 0,
      body.length > 0 ? "note has content" : "empty notes cannot be filed"
    ),
    check(
      "second-scorer-agrees",
      categoryAgrees,
      categoryAgrees
        ? `second scorer is ${secondScorer.category}`
        : `written category is ${decision.category} but second scorer is ${secondScorer.category}`
    ),
    check(
      "not-general",
      decision.category !== "general",
      decision.category !== "general"
        ? `category ${decision.category}`
        : "general notes stay in needs-review until a manager files them"
    ),
    check(
      "confidence-high-enough",
      decision.confidence >= VERIFY_MIN_CONFIDENCE,
      decision.confidence >= VERIFY_MIN_CONFIDENCE
        ? `confidence ${decision.confidence.toFixed(2)}`
        : `confidence ${decision.confidence.toFixed(2)} is below ${VERIFY_MIN_CONFIDENCE} — needs-review`
    ),
    check(
      "destination-matches-category",
      destinationMatchesCategory(decision) && decision.noteId === note.id,
      destinationMatchesCategory(decision) && decision.noteId === note.id
        ? `destination ${decision.destination.driveFolder}`
        : `destination ${decision.destination.driveFolder} / ${decision.destination.localPath} does not match ${decision.category}`
    ),
    check(
      "no-simulated-drive-links",
      driveLinks.length === 0 || driveLinksAllowed,
      driveLinks.length === 0
        ? "no Drive links (Drive folder is not wired — fail closed, local file only)"
        : driveLinksAllowed
          ? `${driveLinks.length} live Drive link(s)`
          : "refusing placeholder / simulated Drive file IDs. Catalog is not live."
    ),
    check(
      "drive-links-in-manager-catalog",
      invalidDriveLinks.length === 0,
      invalidDriveLinks.length === 0
        ? `${driveLinks.length} Drive link(s) passed ACL`
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
  if (!driveConfigured) {
    warnings.push(
      "Drive folder id is null. Filing is local-only. Do not treat links as live Google Drive files."
    );
  }

  const ok = checks.filter((item) => item.blocking).every((item) => item.ok);
  return { ok, checks, warnings };
}
