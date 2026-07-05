import type {
  JournalEntry as PrismaJournalEntry,
  Notebook as PrismaNotebook,
} from "@prisma/client";
import type { JournalEntry, Notebook } from "./journal-types";

export function serializeNotebook(
  notebook: PrismaNotebook & { _count?: { entries: number } }
): Notebook {
  return {
    id: notebook.id,
    name: notebook.name,
    color: notebook.color,
    entryCount: notebook._count?.entries,
    createdAt: notebook.createdAt.toISOString(),
    updatedAt: notebook.updatedAt.toISOString(),
  };
}

export function serializeEntry(entry: PrismaJournalEntry): JournalEntry {
  let tags: string[] = [];
  try {
    const parsed = JSON.parse(entry.tags);
    if (Array.isArray(parsed)) tags = parsed.filter((t) => typeof t === "string");
  } catch {
    // Corrupt tags fall back to empty.
  }

  return {
    id: entry.id,
    notebookId: entry.notebookId,
    title: entry.title,
    content: entry.content,
    tags,
    mood: entry.mood,
    aiSummary: entry.aiSummary,
    pinned: entry.pinned,
    entryDate: entry.entryDate.toISOString(),
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  };
}
