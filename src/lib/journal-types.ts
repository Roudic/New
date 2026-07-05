export interface Notebook {
  id: string;
  name: string;
  color: string;
  entryCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface JournalEntry {
  id: string;
  notebookId: string;
  title: string;
  content: string;
  tags: string[];
  mood: string | null;
  aiSummary: string | null;
  pinned: boolean;
  entryDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface JournalEntryDraft {
  notebookId?: string;
  title?: string;
  content?: string;
  tags?: string[];
  mood?: string | null;
  pinned?: boolean;
  entryDate?: string;
}

export const NOTEBOOK_COLORS = [
  "blue",
  "violet",
  "emerald",
  "amber",
  "rose",
  "cyan",
] as const;

export type NotebookColor = (typeof NOTEBOOK_COLORS)[number];

export type AiAction = "summarize" | "ask" | "organize" | "reflect";

export interface AiOrganizeResult {
  entryId: string;
  tags: string[];
  mood: string;
}
