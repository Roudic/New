import { authorize, findManagerSeat, isGrantedManagerEmail, normalizeEmail } from "./access";
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
  if (!isGrantedManagerEmail(roster, note.actorEmail)) {
    store.deleteNote(note.id);
    return {
      note: {
        ...note,
        body: "",
        status: "rejected",
        rejectedReason:
          "Not a granted manager on the 4-seat roster. Drop discarded; body not stored.",
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
    if (claimed && !isGrantedManagerEmail(roster, claimed)) {
      results.push({
        links: [],
        discarded: {
          filename: drop.filename,
          claimedActor: claimed,
          reason:
            "Inbox frontmatter actor is not on the 4-manager roster (or is store-team). Drop discarded; body not stored.",
        },
      });
      continue;
    }

    const seat = claimed
      ? findManagerSeat(roster, claimed)
      : access.seat;
    const note = createNote({
      actorEmail: claimed || access.email,
      actorName: seat?.name ?? undefined,
      title: drop.title,
      body: drop.body,
      source: drop.source,
      url: drop.url,
    });
    store.putNote(note);
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
