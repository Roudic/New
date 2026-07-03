import { NextResponse } from "next/server";
import { ensureDatabaseSchema } from "@/lib/db-schema";
import { getDatabaseHint, prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const configError = getDatabaseHint();

  if (configError) {
    return NextResponse.json(
      { ok: false, error: configError },
      { status: 503 }
    );
  }

  try {
    await ensureDatabaseSchema();
    const userCount = await prisma.user.count();
    return NextResponse.json({
      ok: true,
      users: userCount,
      needsSeed: userCount === 0,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Database connection failed. Verify DATABASE_URL and run npm run db:push && npm run db:seed.",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 }
    );
  }
}
