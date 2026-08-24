import { prisma } from "@/lib/prisma";

const SCORECARD_DDL = [
  `CREATE TABLE IF NOT EXISTS "ScorecardStore" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "location" TEXT NOT NULL DEFAULT 'Chick-fil-A Hueytown',
    "payload" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
  )`,
];

let ensured: Promise<void> | null = null;

export function ensureScorecardTable(): Promise<void> {
  if (!ensured) {
    ensured = (async () => {
      for (const stmt of SCORECARD_DDL) {
        await prisma.$executeRawUnsafe(stmt);
      }
    })().catch((error) => {
      ensured = null;
      throw error;
    });
  }
  return ensured;
}
