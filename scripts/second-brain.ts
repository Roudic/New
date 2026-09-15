#!/usr/bin/env npx tsx
import fs from "node:fs";
import path from "node:path";
import {
  OPERATOR_EMAIL,
  captureNote,
  driveSharePlan,
  FileBrainStore,
  grantManagerSeat,
  processInbox,
  processNote,
  readNotes,
  seedCatalogFromExample,
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
  seedCatalogFromExample(
    path.join(process.cwd(), "second-brain", "drive-catalog.example.json"),
    store
  );
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
  return `Second Brain OPs — manager-only capture / classify / file / link / verify

Usage:
  npx tsx scripts/second-brain.ts capture --actor EMAIL --title "..." --body "..."
  npx tsx scripts/second-brain.ts capture --actor EMAIL --file note.md [--process]
  npx tsx scripts/second-brain.ts process --actor EMAIL
  npx tsx scripts/second-brain.ts status --actor EMAIL
  npx tsx scripts/second-brain.ts grant --actor EMAIL --name "Full Name" --email name@example.com

Drop unorganized notes into data/second-brain/inbox/ as .md files (frontmatter actor/title).
Drive is the file layer. This CLI is the agentic OS. No app UI.
`;
}

async function main() {
  const command = process.argv[2];
  if (!command || command === "help" || command === "--help") {
    process.stdout.write(usage());
    return;
  }

  const store = openStore();
  const actor = arg("actor") ?? OPERATOR_EMAIL;

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
      counts: {
        inbox: notes.filter((note) => note.status === "inbox").length,
        pendingVerify: notes.filter((note) => note.status === "pending-verify").length,
        filed: notes.filter((note) => note.status === "filed").length,
        needsReview: notes.filter((note) => note.status === "needs-review").length,
        rejected: notes.filter((note) => note.status === "rejected").length,
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
      next: `Share the Drive folder with ${result.seat.email} as Editor. Do not share with the store team.`,
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
