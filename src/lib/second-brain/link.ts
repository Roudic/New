import type {
  CapturedNote,
  DriveFile,
  KnowledgeLink,
  SecondBrainCategory,
} from "./types";

const STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "to",
  "of",
  "in",
  "on",
  "for",
  "was",
  "were",
  "is",
  "are",
  "be",
  "at",
  "by",
  "with",
  "from",
  "that",
  "this",
  "it",
  "we",
  "they",
  "need",
  "needs",
  "just",
]);

const CATEGORY_FOLDERS: Record<SecondBrainCategory, string[]> = {
  "shift-notes": ["shift notes", "shifts"],
  vendor: ["vendors", "vendor"],
  training: ["training"],
  incidents: ["incidents", "incident"],
  schedules: ["schedules", "schedule"],
  general: ["general"],
};

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token));
}

function unique(tokens: string[]): string[] {
  return [...new Set(tokens)];
}

export function isLinkableDriveFile(file: DriveFile): boolean {
  return (
    file.managerShared === true &&
    file.visibility === "managers-only" &&
    Boolean(file.id) &&
    Boolean(file.webViewLink)
  );
}

export function scoreDriveFile(
  note: CapturedNote,
  file: DriveFile
): { score: number; why: string } {
  if (!isLinkableDriveFile(file)) {
    return { score: 0, why: "file is not in the manager-only Drive catalog" };
  }

  const noteTokens = unique(tokenize(`${note.title} ${note.body}`));
  const fileTokens = unique(
    tokenize(`${file.name} ${file.folder} ${file.keywords.join(" ")}`)
  );
  const overlap = fileTokens.filter((token) => noteTokens.includes(token));
  let score = overlap.length;

  const category = note.category;
  if (category) {
    const folders = CATEGORY_FOLDERS[category];
    if (folders.some((folder) => file.folder.toLowerCase().includes(folder))) {
      score += 2;
    }
    for (const keyword of file.keywords) {
      if (containsLoose(`${note.title} ${note.body}`, keyword)) {
        score += 2;
      }
    }
  }

  const why =
    overlap.length > 0
      ? `shared terms: ${overlap.slice(0, 6).join(", ")}`
      : score > 0
        ? "category/folder match"
        : "no overlap";

  return { score, why };
}

function containsLoose(text: string, phrase: string): boolean {
  return text.toLowerCase().includes(phrase.toLowerCase().trim());
}

export function scoreRelatedNote(
  note: CapturedNote,
  other: CapturedNote
): { score: number; why: string } {
  if (other.id === note.id) return { score: 0, why: "same note" };
  if (other.status === "rejected") return { score: 0, why: "rejected" };
  if (other.status !== "filed" && other.status !== "pending-verify") {
    return { score: 0, why: "not filed" };
  }

  const left = unique(tokenize(`${note.title} ${note.body}`));
  const right = unique(tokenize(`${other.title} ${other.body}`));
  const overlap = left.filter((token) => right.includes(token));
  let score = overlap.length;
  if (note.category && other.category === note.category) score += 2;

  return {
    score,
    why:
      overlap.length > 0
        ? `related terms: ${overlap.slice(0, 6).join(", ")}`
        : note.category && other.category === note.category
          ? "same category"
          : "no overlap",
  };
}

export function linkNote(
  note: CapturedNote,
  catalog: DriveFile[],
  otherNotes: CapturedNote[],
  options?: { minScore?: number; limit?: number }
): KnowledgeLink[] {
  const minScore = options?.minScore ?? 2;
  const limit = options?.limit ?? 5;

  const driveLinks: KnowledgeLink[] = catalog
    .map((file) => {
      const { score, why } = scoreDriveFile(note, file);
      return {
        type: "drive-file" as const,
        targetId: file.id,
        title: file.name,
        url: file.webViewLink,
        score,
        why,
      };
    })
    .filter((link) => link.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  const noteLinks: KnowledgeLink[] = otherNotes
    .map((other) => {
      const { score, why } = scoreRelatedNote(note, other);
      return {
        type: "note" as const,
        targetId: other.id,
        title: other.title || other.id,
        score,
        why,
      };
    })
    .filter((link) => link.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return [...driveLinks, ...noteLinks];
}
