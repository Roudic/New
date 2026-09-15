import { authorize } from "./access";
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
    const rejected: CapturedNote = {
      ...note,
      status: "rejected",
      rejectedReason: access.reason,
      links: [],
    };
    store.putNote(rejected);
    return { note: rejected, links: [] };
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
  const access = authorize(actorEmail, store.getRoster(), "process");
  if (!access.ok) {
    throw new Error(access.reason);
  }

  return store.listInbox().map((note) => processNote(store, note));
}

export function readNotes(store: BrainStore, actorEmail: string): CapturedNote[] {
  const access = authorize(actorEmail, store.getRoster(), "read");
  if (!access.ok) {
    throw new Error(access.reason);
  }
  return store.listNotes();
}
