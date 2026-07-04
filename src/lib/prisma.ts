import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const url = process.env.DATABASE_URL ?? "";

  if (url.startsWith("libsql:")) {
    const libsql = createClient({
      url: process.env.DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    const adapter = new PrismaLibSQL(libsql);
    return new PrismaClient({ adapter });
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export function getDatabaseHint(): string | null {
  const url = process.env.DATABASE_URL ?? "";
  if (!url) {
    return "DATABASE_URL is not set. Add it in your environment variables.";
  }
  if (url.startsWith("file:") && process.env.VERCEL) {
    return "SQLite files do not work on Vercel. Use a Turso libsql:// URL instead.";
  }
  if (!process.env.NEXTAUTH_SECRET) {
    return "NEXTAUTH_SECRET is not set. Add a long random string in your environment variables.";
  }
  return null;
}
