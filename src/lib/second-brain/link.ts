import type {
  CapturedNote,
  DriveFile,
  KnowledgeLink,
  SecondBrainCategory,
} from "./types";

const STOPWORDS: Record<string, true> = {
  a: true,
  an: true,
  the: true,
  and: true,
  or: true,
  to: true,
  of: true,
  in: true,
  on: true,
  for: true,
  was: true,
  were: true,
  is: true,
  are: true,
  be: true,
  at: true,
  by: true,
  with: true,
  from: true,
  that: true,
  this: true,
  it: true,
  we: true,
  they: true,
  need: true,
  needs: true,
  just: true,
};

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
    .filter((token) => token.length >= 3 && !STOPWORDS[token]);
}

function unique(tokens: string[]): string[] {
  return tokens.filter((token, index) => tokens.indexOf(token) === index);
}

/** Real Drive file ids are long; placeholders like `drive-vendor-sysco` are not. */
export function isLiveDriveId(id: string): boolean {
  return /^[a-zA-Z0-9_-]{25,}$/.test(id) && !/^drive-[a-z]+-/i.test(id);
}

export function isLiveDriveUrl(url: string, fileId: string): boolean {
  if (!url.startsWith("https://drive.google.com/")) return false;
  return url.includes(fileId) && isLiveDriveId(fileId);
}

export function isSimulatedDriveFile(file: DriveFile): boolean {
  return (
    file.simulated === true ||
    !isLiveDriveId(file.id) ||
    !isLiveDriveUrl(file.webViewLink, file.id)
  );
}

export function hasManagerDriveAcl(file: DriveFile): boolean {
  return (
    file.managerShared === true &&
    file.visibility === "managers-only" &&
    Boolean(file.id) &&
    Boolean(file.webViewLink)
  );
}

export function isLinkableDriveFile(
  file: DriveFile,
  options?: { allowSimulated?: boolean }
): boolean {
  if (!hasManagerDriveAcl(file)) return false;
  if (options?.allowSimulated) return true;
  return !isSimulatedDriveFile(file);
}

export function scoreDriveFile(
  note: CapturedNote,
  file: DriveFile,
  options?: { allowSimulated?: boolean }
): { score: number; why: string } {
  if (!isLinkableDriveFile(file, options)) {
    return { score: 0, why: "file is not in the live manager-only Drive catalog" };
  }

  const noteTokens = unique(tokenize(`${note.title} ${note.body}`));
  const fileTokens = unique(
    tokenize(`${file.name} ${file.folder} ${file.keywords.join(" ")}`)
  );
  const overlap = fileTokens.filter((token) => noteTokens.includes(token));

  if (overlap.length === 0) {
    return {
      score: 0,
      why: "no shared terms (folder match is not enough to link)",
    };
  }

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

  return {
    score,
    why: `shared terms: ${overlap.slice(0, 6).join(", ")}`,
  };
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
  if (overlap.length === 0) {
    return { score: 0, why: "no overlap" };
  }

  let score = overlap.length;
  if (note.category && other.category === note.category) score += 2;

  return {
    score,
    why: `related terms: ${overlap.slice(0, 6).join(", ")}`,
  };
}

export function linkNote(
  note: CapturedNote,
  catalog: DriveFile[],
  otherNotes: CapturedNote[],
  options?: { minScore?: number; limit?: number; allowSimulated?: boolean }
): KnowledgeLink[] {
  const minScore = options?.minScore ?? 2;
  const limit = options?.limit ?? 5;
  const allowSimulated = options?.allowSimulated === true;

  const driveLinks: KnowledgeLink[] = [];
  for (const file of catalog) {
    const { score, why } = scoreDriveFile(note, file, { allowSimulated });
    if (score < minScore) continue;
    driveLinks.push({
      type: "drive-file",
      targetId: file.id,
      title: file.name,
      url: file.webViewLink,
      score,
      why,
    });
  }
  driveLinks.sort((a, b) => b.score - a.score);
  const topDrive = driveLinks.slice(0, limit);

  const noteLinks: KnowledgeLink[] = [];
  for (const other of otherNotes) {
    const { score, why } = scoreRelatedNote(note, other);
    if (score < minScore) continue;
    noteLinks.push({
      type: "note",
      targetId: other.id,
      title: other.title || other.id,
      score,
      why,
    });
  }
  noteLinks.sort((a, b) => b.score - a.score);

  return topDrive.concat(noteLinks.slice(0, limit));
}
