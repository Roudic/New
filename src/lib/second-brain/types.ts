export const SECOND_BRAIN_CATEGORIES = [
  "shift-notes",
  "vendor",
  "training",
  "incidents",
  "schedules",
  "general",
] as const;

export type SecondBrainCategory = (typeof SECOND_BRAIN_CATEGORIES)[number];

export type CaptureSource = "note" | "voice-memo" | "link";

export type NoteStatus =
  | "inbox"
  | "pending-verify"
  | "filed"
  | "needs-review"
  | "rejected";

export type ManagerSeatStatus = "active" | "pending-invite";

export type DriveVisibility = "managers-only" | "store-team" | "anyone-with-link" | "public";

export interface ManagerSeat {
  seat: 1 | 2 | 3 | 4;
  id: string;
  name: string | null;
  email: string | null;
  status: ManagerSeatStatus;
}

export interface DriveFolderPolicy {
  name: string;
  id: string | null;
  visibility: "restricted";
  anyoneWithLink: false;
  shareWithStoreTeam: false;
}

export interface AccessRoster {
  location: string;
  maxSeats: 4;
  driveFolder: DriveFolderPolicy;
  managers: [ManagerSeat, ManagerSeat, ManagerSeat, ManagerSeat];
  howPendingManagersGetAccess: string[];
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType?: string;
  webViewLink: string;
  folder: string;
  keywords: string[];
  managerShared: boolean;
  visibility: DriveVisibility;
}

export interface Classification {
  category: SecondBrainCategory;
  confidence: number;
  scores: Record<SecondBrainCategory, number>;
  reasons: string[];
}

export interface FilingDestination {
  driveFolder: string;
  localPath: string;
}

export interface FilingDecision {
  noteId: string;
  category: SecondBrainCategory;
  confidence: number;
  reasons: string[];
  destination: FilingDestination;
}

export type KnowledgeLinkType = "drive-file" | "note";

export interface KnowledgeLink {
  type: KnowledgeLinkType;
  targetId: string;
  title: string;
  url?: string;
  score: number;
  why: string;
}

export interface VerificationCheck {
  name: string;
  ok: boolean;
  blocking: boolean;
  detail: string;
}

export interface VerificationResult {
  ok: boolean;
  checks: VerificationCheck[];
  warnings: string[];
}

export interface CapturedNote {
  id: string;
  actorEmail: string;
  actorName?: string;
  title: string;
  body: string;
  source: CaptureSource;
  url?: string;
  capturedAt: string;
  status: NoteStatus;
  category?: SecondBrainCategory;
  destination?: FilingDestination;
  filing?: FilingDecision;
  links: KnowledgeLink[];
  verification?: VerificationResult;
  rejectedReason?: string;
}

export type AccessAction = "capture" | "read" | "process" | "grant";

export interface AccessDecision {
  ok: boolean;
  email: string;
  code:
    | "ok"
    | "empty-email"
    | "store-team-denied"
    | "not-a-manager"
    | "pending-seat";
  reason: string;
  seat?: ManagerSeat;
}

export interface ProcessResult {
  note: CapturedNote;
  decision?: FilingDecision;
  links: KnowledgeLink[];
  verification?: VerificationResult;
}
