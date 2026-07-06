import { prisma } from "@/lib/prisma";

// DDL mirrors prisma/schema.prisma for Notebook and JournalEntry so the
// journal works even if `prisma db push` hasn't been run against the
// production database yet. IF NOT EXISTS makes this a no-op afterwards.
const JOURNAL_DDL = [
  `CREATE TABLE IF NOT EXISTS "Notebook" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT 'blue',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Notebook_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "JournalEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "notebookId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL DEFAULT '',
    "tags" TEXT NOT NULL DEFAULT '[]',
    "mood" TEXT,
    "aiSummary" TEXT,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "entryDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "JournalEntry_notebookId_fkey" FOREIGN KEY ("notebookId") REFERENCES "Notebook" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "JournalEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "JournalEntry_userId_updatedAt_idx" ON "JournalEntry"("userId", "updatedAt")`,
  `CREATE INDEX IF NOT EXISTS "JournalEntry_notebookId_idx" ON "JournalEntry"("notebookId")`,
];

let ensured: Promise<void> | null = null;

export function ensureJournalTables(): Promise<void> {
  if (!ensured) {
    ensured = (async () => {
      for (const stmt of JOURNAL_DDL) {
        await prisma.$executeRawUnsafe(stmt);
      }
    })().catch((error) => {
      // Allow a retry on the next request instead of caching the failure.
      ensured = null;
      throw error;
    });
  }
  return ensured;
}
