import { NextResponse } from "next/server";
import {
  inboundSecret,
  parseInboundCalendarEvent,
  parseInboundDriveFile,
  parseInboundNotionPage,
} from "@/lib/second-brain/integrations";
import { withBrainStore } from "@/lib/second-brain/server-store";

export const dynamic = "force-dynamic";

/**
 * Inbound callback from a Zap — not a manager session. Authenticated by a
 * shared secret header, never a manager cookie, since Zapier is not one of
 * the 4 manager seats. Rejects anything that doesn't look like a real Drive
 * file / Calendar event / Notion page (see `integrations.ts` validators);
 * never stores a fabricated id.
 */
export async function POST(request: Request) {
  const configured = inboundSecret();
  if (!configured) {
    return NextResponse.json(
      { error: "Zapier inbound webhook is not configured (ZAPIER_INBOUND_WEBHOOK_SECRET unset)." },
      { status: 503 }
    );
  }

  const provided = request.headers.get("x-zapier-secret");
  if (!provided || provided !== configured) {
    return NextResponse.json({ error: "Invalid or missing Zapier webhook secret." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { type?: string; [key: string]: unknown }
    | null;
  if (!body || typeof body.type !== "string") {
    return NextResponse.json({ error: "Body must include a \"type\"." }, { status: 400 });
  }

  if (body.type === "drive-file") {
    const file = parseInboundDriveFile(body);
    if (!file) {
      return NextResponse.json(
        { error: "Drive file payload is missing fields or does not look like a real Drive file id/url." },
        { status: 400 }
      );
    }
    await withBrainStore((store) => {
      const existing = store.getCatalog().filter((f) => f.id !== file.id);
      store.saveCatalog([...existing, file]);
    });
    return NextResponse.json({ ok: true, type: "drive-file", id: file.id });
  }

  if (body.type === "calendar-event") {
    const event = parseInboundCalendarEvent(body);
    if (!event) {
      return NextResponse.json(
        { error: "Calendar event payload is missing fields or does not look like a real event id/link." },
        { status: 400 }
      );
    }
    await withBrainStore((store) => {
      store.addCalendarEvent(event);
    });
    return NextResponse.json({ ok: true, type: "calendar-event", id: event.id });
  }

  if (body.type === "notion-page") {
    const page = parseInboundNotionPage(body);
    if (!page) {
      return NextResponse.json(
        { error: "Notion page payload is missing fields or does not look like a real page id/url." },
        { status: 400 }
      );
    }
    await withBrainStore((store) => {
      store.addNotionPage(page);
    });
    return NextResponse.json({ ok: true, type: "notion-page", id: page.id });
  }

  return NextResponse.json({ error: `Unknown type "${body.type}".` }, { status: 400 });
}
