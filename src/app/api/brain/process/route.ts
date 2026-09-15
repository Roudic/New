import { NextResponse } from "next/server";
import { processInbox } from "@/lib/second-brain/pipeline";
import { withManagerStore } from "@/lib/second-brain/require-manager";

export const dynamic = "force-dynamic";

export async function POST() {
  const result = await withManagerStore("process", ({ email, store }) =>
    processInbox(store, email)
  );
  if (result instanceof NextResponse) return result;
  return NextResponse.json({ results: result });
}
