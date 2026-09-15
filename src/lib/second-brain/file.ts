import { classify } from "./classify";
import type {
  CapturedNote,
  FilingDecision,
  SecondBrainCategory,
  VerificationResult,
} from "./types";

export const DRIVE_FOLDER_NAMES: Record<SecondBrainCategory | "inbox", string> = {
  inbox: "Inbox",
  "shift-notes": "Shift Notes",
  vendor: "Vendors",
  training: "Training",
  incidents: "Incidents",
  schedules: "Schedules",
  general: "General",
};

export function destinationFor(
  category: SecondBrainCategory,
  noteId: string
): FilingDecision["destination"] {
  return {
    driveFolder: DRIVE_FOLDER_NAMES[category],
    localPath: `filed/${category}/${noteId}.json`,
  };
}

export function proposeFiling(note: CapturedNote): FilingDecision {
  const classification = classify(note.title, note.body);
  return {
    noteId: note.id,
    category: classification.category,
    confidence: classification.confidence,
    reasons: classification.reasons,
    destination: destinationFor(classification.category, note.id),
  };
}

export function applyFiling(note: CapturedNote, decision: FilingDecision): CapturedNote {
  if (note.status === "rejected") return note;
  return {
    ...note,
    category: decision.category,
    destination: decision.destination,
    filing: decision,
    status: "pending-verify",
  };
}

export function commitVerified(
  note: CapturedNote,
  verification: VerificationResult
): CapturedNote {
  if (!verification.ok) {
    return {
      ...note,
      verification,
      status: "needs-review",
    };
  }

  return {
    ...note,
    verification,
    status: "filed",
  };
}

export function destinationMatchesCategory(decision: FilingDecision): boolean {
  return (
    decision.destination.driveFolder === DRIVE_FOLDER_NAMES[decision.category] &&
    decision.destination.localPath === `filed/${decision.category}/${decision.noteId}.json`
  );
}
