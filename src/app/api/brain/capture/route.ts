import { NextResponse } from "next/server";
import { captureNote } from "@/lib/second-brain/pipeline";
import { withManagerStore } from "@/lib/second-brain/require-manager";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    title?: string;
    body?: string;
  };
  const title = (body.title ?? "").trim();
  const noteBody = (body.body ?? "").trim();
  if (!noteBody) {
    return NextResponse.json({ error: "Note body is required." }, { status: 400 });
  }

  const result = await withManagerStore("capture", ({ email, store }) =>
    captureNote(store, {
      actorEmail: email,
      title: title || "Untitled capture",
      body: noteBody,
    })
  );

  if (result instanceof NextResponse) return result;
  return NextResponse.json({ note: result });
}
