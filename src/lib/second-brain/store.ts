import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { defaultRoster, normalizeEmail } from "./access";
import type {
  AccessRoster,
  CalendarEvent,
  CapturedNote,
  CaptureSource,
  DriveFile,
  NotionPage,
} from "./types";

export interface InboxDrop {
  filename: string;
  actorEmail?: string;
  actorName?: string;
  title: string;
  body: string;
  source: CaptureSource;
  url?: string;
}

export interface BrainStore {
  getRoster(): AccessRoster;
  saveRoster(roster: AccessRoster): void;
  getCatalog(): DriveFile[];
  saveCatalog(files: DriveFile[]): void;
  getCalendarEvents(): CalendarEvent[];
  addCalendarEvent(event: CalendarEvent): void;
  getNotionPages(): NotionPage[];
  addNotionPage(page: NotionPage): void;
  putNote(note: CapturedNote): void;
  deleteNote(id: string): void;
  getNote(id: string): CapturedNote | undefined;
  listNotes(): CapturedNote[];
  listInbox(): CapturedNote[];
  consumeInboxDrops(): InboxDrop[];
}

export function createNote(input: {
  actorEmail: string;
  actorName?: string;
  title: string;
  body: string;
  source?: CaptureSource;
  url?: string;
  capturedAt?: string;
  id?: string;
}): CapturedNote {
  return {
    id: input.id ?? randomUUID(),
    actorEmail: normalizeEmail(input.actorEmail),
    actorName: input.actorName,
    title: input.title.trim(),
    body: input.body.trim(),
    source: input.source ?? "note",
    url: input.url,
    capturedAt: input.capturedAt ?? new Date().toISOString(),
    status: "inbox",
    links: [],
  };
}

function mapValues<T>(map: Map<string, T>): T[] {
  const values: T[] = [];
  map.forEach((value) => {
    values.push(value);
  });
  return values;
}

export class MemoryBrainStore implements BrainStore {
  constructor(
    private roster: AccessRoster = defaultRoster(),
    private catalog: DriveFile[] = [],
    private notes: Map<string, CapturedNote> = new Map(),
    private calendarEvents: CalendarEvent[] = [],
    private notionPages: NotionPage[] = []
  ) {}

  getRoster(): AccessRoster {
    return this.roster;
  }

  saveRoster(roster: AccessRoster): void {
    this.roster = roster;
  }

  getCatalog(): DriveFile[] {
    return this.catalog;
  }

  saveCatalog(files: DriveFile[]): void {
    this.catalog = files;
  }

  getCalendarEvents(): CalendarEvent[] {
    return this.calendarEvents;
  }

  addCalendarEvent(event: CalendarEvent): void {
    this.calendarEvents = this.calendarEvents
      .filter((existing) => existing.id !== event.id)
      .concat(event)
      .sort((a, b) => a.start.localeCompare(b.start));
  }

  getNotionPages(): NotionPage[] {
    return this.notionPages;
  }

  addNotionPage(page: NotionPage): void {
    this.notionPages = this.notionPages
      .filter((existing) => existing.id !== page.id)
      .concat(page);
  }

  putNote(note: CapturedNote): void {
    this.notes.set(note.id, note);
  }

  deleteNote(id: string): void {
    this.notes.delete(id);
  }

  getNote(id: string): CapturedNote | undefined {
    return this.notes.get(id);
  }

  listNotes(): CapturedNote[] {
    return mapValues(this.notes).sort((a, b) =>
      a.capturedAt.localeCompare(b.capturedAt)
    );
  }

  listInbox(): CapturedNote[] {
    return this.listNotes().filter((note) => note.status === "inbox");
  }

  consumeInboxDrops(): InboxDrop[] {
    return [];
  }
}

export class FileBrainStore implements BrainStore {
  constructor(private rootDir: string) {
    fs.mkdirSync(path.join(rootDir, "notes"), { recursive: true });
    fs.mkdirSync(path.join(rootDir, "inbox"), { recursive: true });
    fs.mkdirSync(path.join(rootDir, "filed"), { recursive: true });
  }

  getRoster(): AccessRoster {
    const file = path.join(this.rootDir, "access.json");
    if (!fs.existsSync(file)) {
      this.saveRoster(defaultRoster());
    }
    return JSON.parse(fs.readFileSync(file, "utf8")) as AccessRoster;
  }

  saveRoster(roster: AccessRoster): void {
    fs.mkdirSync(this.rootDir, { recursive: true });
    fs.writeFileSync(
      path.join(this.rootDir, "access.json"),
      `${JSON.stringify(roster, null, 2)}\n`
    );
  }

  getCatalog(): DriveFile[] {
    const file = path.join(this.rootDir, "catalog.json");
    if (!fs.existsSync(file)) return [];
    return JSON.parse(fs.readFileSync(file, "utf8")) as DriveFile[];
  }

  saveCatalog(files: DriveFile[]): void {
    const live = files.filter((file) => file.simulated !== true);
    fs.writeFileSync(
      path.join(this.rootDir, "catalog.json"),
      `${JSON.stringify(live, null, 2)}\n`
    );
  }

  getCalendarEvents(): CalendarEvent[] {
    const file = path.join(this.rootDir, "calendar.json");
    if (!fs.existsSync(file)) return [];
    return JSON.parse(fs.readFileSync(file, "utf8")) as CalendarEvent[];
  }

  addCalendarEvent(event: CalendarEvent): void {
    const events = this.getCalendarEvents()
      .filter((existing) => existing.id !== event.id)
      .concat(event)
      .sort((a, b) => a.start.localeCompare(b.start));
    fs.writeFileSync(
      path.join(this.rootDir, "calendar.json"),
      `${JSON.stringify(events, null, 2)}\n`
    );
  }

  getNotionPages(): NotionPage[] {
    const file = path.join(this.rootDir, "notion.json");
    if (!fs.existsSync(file)) return [];
    return JSON.parse(fs.readFileSync(file, "utf8")) as NotionPage[];
  }

  addNotionPage(page: NotionPage): void {
    const pages = this.getNotionPages()
      .filter((existing) => existing.id !== page.id)
      .concat(page);
    fs.writeFileSync(
      path.join(this.rootDir, "notion.json"),
      `${JSON.stringify(pages, null, 2)}\n`
    );
  }

  putNote(note: CapturedNote): void {
    const file = path.join(this.rootDir, "notes", `${note.id}.json`);
    fs.writeFileSync(file, `${JSON.stringify(note, null, 2)}\n`);
    this.syncFiledCopy(note);
  }

  deleteNote(id: string): void {
    const file = path.join(this.rootDir, "notes", `${id}.json`);
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }

  getNote(id: string): CapturedNote | undefined {
    const file = path.join(this.rootDir, "notes", `${id}.json`);
    if (!fs.existsSync(file)) return undefined;
    return JSON.parse(fs.readFileSync(file, "utf8")) as CapturedNote;
  }

  listNotes(): CapturedNote[] {
    const dir = path.join(this.rootDir, "notes");
    if (!fs.existsSync(dir)) return [];
    return fs
      .readdirSync(dir)
      .filter((name) => name.endsWith(".json"))
      .map((name) =>
        JSON.parse(fs.readFileSync(path.join(dir, name), "utf8")) as CapturedNote
      )
      .sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
  }

  listInbox(): CapturedNote[] {
    return this.listNotes().filter((note) => note.status === "inbox");
  }

  consumeInboxDrops(): InboxDrop[] {
    const inboxDir = path.join(this.rootDir, "inbox");
    if (!fs.existsSync(inboxDir)) return [];
    const drops: InboxDrop[] = [];

    for (const name of fs.readdirSync(inboxDir)) {
      if (!name.endsWith(".md") && !name.endsWith(".txt")) continue;
      const file = path.join(inboxDir, name);
      const raw = fs.readFileSync(file, "utf8");
      const parsed = parseDroppedNote(raw, name);
      drops.push({ filename: name, ...parsed });
      fs.unlinkSync(file);
    }

    return drops;
  }

  private syncFiledCopy(note: CapturedNote): void {
    if (note.status !== "filed" || !note.destination) return;
    const dest = path.join(this.rootDir, note.destination.localPath);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, `${JSON.stringify(note, null, 2)}\n`);
  }
}

export function parseDroppedNote(
  raw: string,
  filename: string
): {
  actorEmail?: string;
  actorName?: string;
  title: string;
  body: string;
  source: CaptureSource;
  url?: string;
} {
  const frontmatter = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  const meta: Record<string, string> = {};
  let body = raw.trim();

  if (frontmatter) {
    for (const line of frontmatter[1].split("\n")) {
      const idx = line.indexOf(":");
      if (idx === -1) continue;
      meta[line.slice(0, idx).trim().toLowerCase()] = line.slice(idx + 1).trim();
    }
    body = frontmatter[2].trim();
  }

  const titleFromFile = filename.replace(/\.(md|txt)$/i, "").replace(/[-_]/g, " ");
  return {
    actorEmail: meta.actor || meta.email || meta.actorEmail,
    actorName: meta.name || meta.actorName,
    title: meta.title || titleFromFile,
    body,
    source: (meta.source as CaptureSource) || "note",
    url: meta.url,
  };
}
