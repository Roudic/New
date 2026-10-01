/**
 * Zapier is the glue between Second Brain and Google Drive / Google Calendar /
 * Notion. This repo never calls those APIs directly and never invents a
 * folder id, calendar id, or Notion page id.
 *
 * Outbound: when a note files, we POST it to a Zap trigger webhook (if
 * configured). The Zap decides where it lands (which Drive folder, which
 * Notion database) — Joshua has not named those targets yet, so the Zap
 * itself must be built before this does anything beyond a fire-and-forget
 * notification.
 *
 * Inbound: Zaps call back into `/api/brain/integrations/zapier` with the real
 * Drive file / Calendar event / Notion page that resulted, authenticated by a
 * shared secret header (not a manager cookie — Zapier is not a manager).
 */
import { isLiveDriveId } from "./link";
import type {
  CalendarEvent,
  CapturedNote,
  DriveFile,
  FilingDecision,
  IntegrationApp,
  IntegrationPanelState,
  NotionPage,
  ZapierDispatchResult,
} from "./types";

export const ZAPIER_ENV = {
  /** Outbound: Zap trigger webhook URL. Fires on every filed note. */
  CAPTURE_WEBHOOK_URL: "ZAPIER_CAPTURE_WEBHOOK_URL",
  /** Inbound: shared secret the Zap must send back on every callback. */
  INBOUND_SECRET: "ZAPIER_INBOUND_WEBHOOK_SECRET",
  /** Named by Joshua once a real Drive folder is picked. Not required to wire the webhook. */
  DRIVE_FOLDER_NAME: "SECOND_BRAIN_DRIVE_FOLDER_NAME",
  /** Named by Joshua once a real calendar is picked. */
  CALENDAR_NAME: "SECOND_BRAIN_CALENDAR_NAME",
  /** Named by Joshua once a real Notion page/database is picked. */
  NOTION_TARGET_NAME: "SECOND_BRAIN_NOTION_TARGET_NAME",
} as const;

function envValue(name: string): string {
  return (process.env[name] ?? "").trim();
}

export function captureWebhookUrl(): string | null {
  const value = envValue(ZAPIER_ENV.CAPTURE_WEBHOOK_URL);
  return value ? value : null;
}

export function inboundSecret(): string | null {
  const value = envValue(ZAPIER_ENV.INBOUND_SECRET);
  return value ? value : null;
}

export function isCaptureWebhookConfigured(): boolean {
  return captureWebhookUrl() !== null;
}

export function isInboundWebhookConfigured(): boolean {
  return inboundSecret() !== null;
}

function namedTarget(app: IntegrationApp): string | null {
  const envName =
    app === "drive"
      ? ZAPIER_ENV.DRIVE_FOLDER_NAME
      : app === "calendar"
        ? ZAPIER_ENV.CALENDAR_NAME
        : ZAPIER_ENV.NOTION_TARGET_NAME;
  const value = envValue(envName);
  return value ? value : null;
}

const APP_LABEL: Record<IntegrationApp, string> = {
  drive: "Google Drive",
  calendar: "Google Calendar",
  notion: "Notion",
};

/**
 * Honest connection state for a dashboard panel. Never reports "connected"
 * just because a Zapier account exists — Joshua has to name a real target
 * (folder / calendar / page) before this app treats the surface as live.
 */
export function integrationPanelState(app: IntegrationApp): IntegrationPanelState {
  const target = namedTarget(app);
  const webhookConfigured = isCaptureWebhookConfigured() || isInboundWebhookConfigured();
  const label = APP_LABEL[app];

  if (!target) {
    return {
      app,
      targetConfigured: false,
      webhookConfigured,
      message: `${label} is not connected yet — no ${
        app === "drive" ? "folder" : app === "calendar" ? "calendar" : "page/database"
      } has been named. Set ${
        app === "drive"
          ? ZAPIER_ENV.DRIVE_FOLDER_NAME
          : app === "calendar"
            ? ZAPIER_ENV.CALENDAR_NAME
            : ZAPIER_ENV.NOTION_TARGET_NAME
      } once Joshua picks one.`,
    };
  }

  if (!webhookConfigured) {
    return {
      app,
      targetConfigured: true,
      webhookConfigured: false,
      message: `${label} target "${target}" is named, but no Zapier webhook is wired yet. Set ${ZAPIER_ENV.CAPTURE_WEBHOOK_URL} / ${ZAPIER_ENV.INBOUND_SECRET}.`,
    };
  }

  return {
    app,
    targetConfigured: true,
    webhookConfigured: true,
    message: `${label} is wired to "${target}" via Zapier.`,
  };
}

/**
 * Fire-and-forget notification to the Zap that routes a filed note to Drive /
 * Notion. Never throws — a missing or failing webhook must not block filing.
 */
export async function notifyZapierCapture(
  note: CapturedNote,
  decision: FilingDecision
): Promise<ZapierDispatchResult> {
  const url = captureWebhookUrl();
  if (!url) {
    return {
      attempted: false,
      dispatched: false,
      reason: `${ZAPIER_ENV.CAPTURE_WEBHOOK_URL} is not set — Zapier capture sync is off.`,
    };
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        noteId: note.id,
        title: note.title,
        body: note.body,
        category: decision.category,
        actorEmail: note.actorEmail,
        capturedAt: note.capturedAt,
        destination: decision.destination,
      }),
    });
    if (!res.ok) {
      return {
        attempted: true,
        dispatched: false,
        reason: `Zapier webhook responded ${res.status}.`,
      };
    }
    return { attempted: true, dispatched: true, reason: "Posted to Zapier capture webhook." };
  } catch (error) {
    return {
      attempted: true,
      dispatched: false,
      reason: `Zapier webhook call failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}

export function isLiveCalendarEventId(id: string): boolean {
  return /^[a-zA-Z0-9_-]{8,}$/.test(id);
}

const CALENDAR_LINK_HOSTS = ["calendar.google.com", "docs.google.com"];

export function isLiveCalendarEventUrl(url: string): boolean {
  if (!url.startsWith("https://")) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return CALENDAR_LINK_HOSTS.includes(host);
  } catch {
    return false;
  }
}

export function isLiveNotionPageId(id: string): boolean {
  return /^[a-zA-Z0-9-]{16,}$/.test(id);
}

/**
 * Validate+narrow an inbound Drive-file callback. Rejects short/placeholder
 * ids the same way the rest of the app refuses simulated Drive links.
 */
export function parseInboundDriveFile(payload: unknown): DriveFile | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  const id = typeof p.id === "string" ? p.id.trim() : "";
  const name = typeof p.name === "string" ? p.name.trim() : "";
  const webViewLink = typeof p.webViewLink === "string" ? p.webViewLink.trim() : "";
  const folder = typeof p.folder === "string" ? p.folder.trim() : "general";
  if (!id || !name || !webViewLink) return null;
  if (!isLiveDriveId(id)) return null;
  if (!webViewLink.startsWith("https://drive.google.com/") || !webViewLink.includes(id)) {
    return null;
  }
  const keywords = Array.isArray(p.keywords)
    ? p.keywords.filter((k): k is string => typeof k === "string")
    : [];
  return {
    id,
    name,
    mimeType: typeof p.mimeType === "string" ? p.mimeType : undefined,
    webViewLink,
    folder,
    keywords,
    managerShared: true,
    visibility: "managers-only",
    simulated: false,
  };
}

export function parseInboundCalendarEvent(payload: unknown): CalendarEvent | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  const id = typeof p.id === "string" ? p.id.trim() : "";
  const title = typeof p.title === "string" ? p.title.trim() : "";
  const start = typeof p.start === "string" ? p.start.trim() : "";
  const htmlLink = typeof p.htmlLink === "string" ? p.htmlLink.trim() : "";
  if (!id || !title || !start || !htmlLink) return null;
  if (!isLiveCalendarEventId(id)) return null;
  if (!isLiveCalendarEventUrl(htmlLink)) return null;
  return {
    id,
    title,
    start,
    end: typeof p.end === "string" ? p.end : undefined,
    htmlLink,
    calendarName: typeof p.calendarName === "string" ? p.calendarName : undefined,
    source: "zapier",
    receivedAt: new Date().toISOString(),
  };
}

export function parseInboundNotionPage(payload: unknown): NotionPage | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  const id = typeof p.id === "string" ? p.id.trim() : "";
  const title = typeof p.title === "string" ? p.title.trim() : "";
  const url = typeof p.url === "string" ? p.url.trim() : "";
  if (!id || !title || !url) return null;
  if (!isLiveNotionPageId(id)) return null;
  if (!url.startsWith("https://www.notion.so/") && !url.startsWith("https://notion.so/")) {
    return null;
  }
  return {
    id,
    title,
    url,
    databaseName: typeof p.databaseName === "string" ? p.databaseName : undefined,
    source: "zapier",
    receivedAt: new Date().toISOString(),
  };
}
