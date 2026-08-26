import { prisma } from "@/lib/prisma";

const L10_DDL = [
  `CREATE TABLE IF NOT EXISTS "L10Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "scheduledAt" DATETIME NOT NULL,
    "location" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'prep',
    "rating" INTEGER,
    "payload" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "L10Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "L10Session_userId_scheduledAt_idx" ON "L10Session"("userId", "scheduledAt")`,
];

let ensured: Promise<void> | null = null;

export function ensureL10Tables(): Promise<void> {
  if (!ensured) {
    ensured = (async () => {
      for (const stmt of L10_DDL) {
        await prisma.$executeRawUnsafe(stmt);
      }
    })().catch((error) => {
      ensured = null;
      throw error;
    });
  }
  return ensured;
}
