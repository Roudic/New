import { authorize, normalizeEmail } from "./access";
import { applyFiling, commitVerified, proposeFiling } from "./file";
import { linkNote } from "./link";
import { createNote, type BrainStore } from "./store";
import type {
  CapturedNote,
  CaptureSource,
  ProcessResult,
} from "./types";
import { verifyFiling } from "./verify";

export function captureNote(
  store: BrainStore,
  input: {
    actorEmail: string;
    actorName?: string;
    title: string;
    body: string;
    source?: CaptureSource;
    url?: string;
  }
): CapturedNote {
  const access = authorize(input.actorEmail, store.getRoster(), "capture");
  if (!access.ok) {
    throw new Error(access.reason);
  }

  const note = createNote({
    ...input,
    actorEmail: access.email,
    actorName: input.actorName ?? access.seat?.name ?? undefined,
  });
  store.putNote(note);
  return note;
}

export function processNote(store: BrainStore, note: CapturedNote): ProcessResult {
  const roster = store.getRoster();
  const access = authorize(note.actorEmail, roster, "capture");
  if (!access.ok) {
    store.deleteNote(note.id);
    return {
      note: {
        ...note,
        body: "",
        status: "rejected",
        rejectedReason: access.reason,
        links: [],
      },
      links: [],
    };
  }

  const decision = proposeFiling(note);
  const pending = applyFiling(note, decision);
  const links = linkNote(pending, store.getCatalog(), store.listNotes());
  const withLinks: CapturedNote = { ...pending, links };
  const verification = verifyFiling({
    note: withLinks,
    decision,
    links,
    catalog: store.getCatalog(),
    roster,
  });
  const committed = commitVerified(withLinks, verification);
  store.putNote(committed);
  return { note: committed, decision, links, verification };
}

export function processInbox(
  store: BrainStore,
  actorEmail: string
): ProcessResult[] {
  const roster = store.getRoster();
  const access = authorize(actorEmail, roster, "process");
  if (!access.ok) {
    throw new Error(access.reason);
  }

  const results: ProcessResult[] = [];
  const drops = store.consumeInboxDrops();

  for (const drop of drops) {
    const claimed = normalizeEmail(drop.actorEmail);
    if (claimed && claimed !== access.email) {
      results.push({
        links: [],
        discarded: {
          filename: drop.filename,
          claimedActor: claimed,
          reason:
            "Inbox frontmatter actor is not trusted. Claimed identity does not match the authenticated processor. Drop discarded; body not stored.",
        },
      });
      continue;
    }

    const note = captureNote(store, {
      actorEmail: access.email,
      actorName: access.seat?.name ?? undefined,
      title: drop.title,
      body: drop.body,
      source: drop.source,
      url: drop.url,
    });
    results.push(processNote(store, note));
  }

  for (const note of store.listInbox()) {
    results.push(processNote(store, note));
  }

  return results;
}

export function readNotes(store: BrainStore, actorEmail: string): CapturedNote[] {
  const access = authorize(actorEmail, store.getRoster(), "read");
  if (!access.ok) {
    throw new Error(access.reason);
  }
  return store.listNotes().filter((note) => note.status !== "rejected");
}
