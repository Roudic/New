#!/usr/bin/env npx tsx
import fs from "node:fs";
import path from "node:path";
import {
  captureNote,
  confirmDriveShare,
  driveSharePlan,
  FileBrainStore,
  grantManagerSeat,
  processInbox,
  processNote,
  readNotes,
} from "../src/lib/second-brain";

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

function requiredArg(name: string): string {
  const value = arg(name);
  if (!value) {
    throw new Error(`Missing --${name}`);
  }
  return value;
}

function storeRoot(): string {
  return arg("store") ?? path.join(process.cwd(), "data", "second-brain");
}

function openStore() {
  const store = new FileBrainStore(storeRoot());
  const rosterFile = path.join(process.cwd(), "second-brain", "access.json");
  if (!fs.existsSync(path.join(storeRoot(), "access.json")) && fs.existsSync(rosterFile)) {
    store.saveRoster(JSON.parse(fs.readFileSync(rosterFile, "utf8")));
  }
  return store;
}

function printJson(value: unknown) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function usage(): string {
  return `Second Brain OPs — manager-only capture / classify / file / verify

--actor EMAIL is required on every command. It is never defaulted to Joshua.

Usage:
  npx tsx scripts/second-brain.ts capture --actor EMAIL --title "..." --body "..."
  npx tsx scripts/second-brain.ts capture --actor EMAIL --file note.md [--process]
  npx tsx scripts/second-brain.ts process --actor EMAIL
  npx tsx scripts/second-brain.ts status --actor EMAIL
  npx tsx scripts/second-brain.ts grant --actor EMAIL --name "Full Name" --email name@example.com
  npx tsx scripts/second-brain.ts confirm-share --actor EMAIL --email name@example.com

Inbox drops: data/second-brain/inbox/*.md. Claimed actor must be a granted roster email (or omitted = processor).
Drive is not wired. confirm-share will not activate seats; a folder id in JSON is not proof of share.
`;
}

async function main() {
  const command = process.argv[2];
  if (!command || command === "help" || command === "--help") {
    process.stdout.write(usage());
    return;
  }

  const store = openStore();
  const actor = requiredArg("actor");

  if (command === "capture") {
    const file = arg("file");
    let title = arg("title");
    let body = arg("body");
    if (file) {
      body = fs.readFileSync(file, "utf8");
      title = title ?? path.basename(file);
    }
    if (!title || body === undefined) {
      throw new Error("Provide --title and --body, or --file");
    }
    const note = captureNote(store, {
      actorEmail: actor,
      title,
      body,
      source: (arg("source") as "note" | "voice-memo" | "link") ?? "note",
      url: arg("url"),
    });
    const result = process.argv.includes("--process") ? processNote(store, note) : { note };
    printJson(result);
    return;
  }

  if (command === "process") {
    printJson(processInbox(store, actor));
    return;
  }

  if (command === "status") {
    const notes = readNotes(store, actor);
    printJson({
      actor,
      sharePlan: driveSharePlan(store.getRoster()),
      drive: {
        folderId: store.getRoster().driveFolder.id,
        live: Boolean(store.getRoster().driveFolder.id),
        catalogFiles: store.getCatalog().length,
        note: store.getRoster().driveFolder.id
          ? "Drive folder id is set in JSON but live ACL is not wired. Do not treat this as a confirmed share."
          : "Drive folder id is null. Local filing only. Placeholder catalog is not loaded. confirm-share will not activate seats.",
      },
      counts: {
        inbox: notes.filter((note) => note.status === "inbox").length,
        pendingVerify: notes.filter((note) => note.status === "pending-verify").length,
        filed: notes.filter((note) => note.status === "filed").length,
        needsReview: notes.filter((note) => note.status === "needs-review").length,
      },
      notes: notes.map((note) => ({
        id: note.id,
        title: note.title,
        status: note.status,
        category: note.category,
        destination: note.destination?.driveFolder,
        links: note.links.length,
        verifyOk: note.verification?.ok ?? null,
      })),
    });
    return;
  }

  if (command === "grant") {
    const result = grantManagerSeat(store.getRoster(), actor, {
      name: requiredArg("name"),
      email: requiredArg("email"),
    });
    if (!result.ok) {
      throw new Error(result.error);
    }
    store.saveRoster(result.roster);
    printJson({
      granted: result.seat,
      sharePlan: driveSharePlan(result.roster),
      next: `Seat stays pending-invite. Live Drive ACL is not wired — confirm-share will not activate this seat. A folder id in JSON is not proof of share.`,
    });
    return;
  }

  if (command === "confirm-share") {
    const result = confirmDriveShare(
      store.getRoster(),
      actor,
      requiredArg("email")
    );
    if (!result.ok) {
      throw new Error(result.error);
    }
    store.saveRoster(result.roster);
    printJson({
      activated: result.seat,
      sharePlan: driveSharePlan(result.roster),
    });
    return;
  }

  throw new Error(`Unknown command "${command}".\n${usage()}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
