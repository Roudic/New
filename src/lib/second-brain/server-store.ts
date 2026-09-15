import path from "node:path";
import { ensureDatabaseSchema } from "@/lib/db-schema";
import { prisma } from "@/lib/prisma";
import { defaultRoster } from "./access";
import { FileBrainStore, MemoryBrainStore, type BrainStore } from "./store";
import type { AccessRoster, CapturedNote, DriveFile } from "./types";

interface PersistedPayload {
  roster: AccessRoster;
  catalog: DriveFile[];
  notes: CapturedNote[];
}

function emptyPayload(): PersistedPayload {
  return { roster: defaultRoster(), catalog: [], notes: [] };
}

function memoryFromPayload(payload: PersistedPayload): MemoryBrainStore {
  const notes = new Map<string, CapturedNote>();
  for (const note of payload.notes) {
    notes.set(note.id, note);
  }
  return new MemoryBrainStore(payload.roster, payload.catalog, notes);
}

function payloadFromStore(store: BrainStore): PersistedPayload {
  return {
    roster: store.getRoster(),
    catalog: store.getCatalog().filter((file) => file.simulated !== true),
    notes: store.listNotes(),
  };
}

export async function withBrainStore<T>(
  fn: (store: BrainStore) => T | Promise<T>
): Promise<T> {
  const url = process.env.DATABASE_URL ?? "";
  if (!url) {
    const root =
      process.env.SECOND_BRAIN_STORE ||
      path.join(process.cwd(), "data", "second-brain");
    return fn(new FileBrainStore(root));
  }

  await ensureDatabaseSchema();
  const row = await prisma.secondBrainState.findUnique({
    where: { id: "hueytown" },
  });
  let payload = emptyPayload();
  if (row?.payload) {
    try {
      payload = { ...emptyPayload(), ...(JSON.parse(row.payload) as PersistedPayload) };
    } catch {
      payload = emptyPayload();
    }
  }
  if (!payload.roster?.managers?.length) {
    payload.roster = defaultRoster();
  }

  const store = memoryFromPayload(payload);
  const result = await fn(store);
  await prisma.secondBrainState.upsert({
    where: { id: "hueytown" },
    create: {
      id: "hueytown",
      payload: JSON.stringify(payloadFromStore(store)),
    },
    update: {
      payload: JSON.stringify(payloadFromStore(store)),
    },
  });
  return result;
}
