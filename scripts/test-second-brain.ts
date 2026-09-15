import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  applyFiling,
  authorize,
  captureNote,
  classify,
  commitVerified,
  defaultRoster,
  destinationFor,
  driveSharePlan,
  FileBrainStore,
  grantManagerSeat,
  isLinkableDriveFile,
  linkNote,
  MemoryBrainStore,
  OPERATOR_EMAIL,
  processInbox,
  processNote,
  proposeFiling,
  readNotes,
  STORE_TEAM_DENYLIST,
  verifyFiling,
  type CapturedNote,
  type DriveFile,
  type FilingDecision,
} from "../src/lib/second-brain";

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

function catalog(): DriveFile[] {
  return [
    {
      id: "drive-sop-food-safety",
      name: "Food Safety SOP",
      webViewLink: "https://drive.google.com/file/d/drive-sop-food-safety/view",
      folder: "SOPs",
      keywords: ["food safety", "sop", "temperature", "incident"],
      managerShared: true,
      visibility: "managers-only",
    },
    {
      id: "drive-vendor-sysco",
      name: "Sysco order guide",
      webViewLink: "https://drive.google.com/file/d/drive-vendor-sysco/view",
      folder: "Vendors",
      keywords: ["sysco", "invoice", "order guide", "credit memo"],
      managerShared: true,
      visibility: "managers-only",
    },
    {
      id: "drive-training-pathway",
      name: "Team Member Pathway",
      webViewLink: "https://drive.google.com/file/d/drive-training-pathway/view",
      folder: "Training",
      keywords: ["pathway", "trainee", "onboarding", "new hire"],
      managerShared: true,
      visibility: "managers-only",
    },
    {
      id: "drive-week-schedule",
      name: "Week schedule",
      webViewLink: "https://drive.google.com/file/d/drive-week-schedule/view",
      folder: "Schedules",
      keywords: ["schedule", "roster", "availability"],
      managerShared: true,
      visibility: "managers-only",
    },
    {
      id: "drive-store-team-handbook",
      name: "Crew handbook",
      webViewLink: "https://drive.google.com/file/d/drive-store-team-handbook/view",
      folder: "Store Team",
      keywords: ["sysco", "invoice", "training", "schedule", "shift", "pathway"],
      managerShared: false,
      visibility: "store-team",
    },
  ];
}

function storeWithCatalog() {
  return new MemoryBrainStore(defaultRoster(), catalog());
}

function testClassify() {
  assert(classify("Sysco short", "Sysco truck shorted 2 cases of nuggets, need a credit memo").category === "vendor", "vendor");
  assert(classify("Pathway", "New hire Marcus is on pathway and needs the food safety video before FOH").category === "training", "training");
  assert(classify("Slip", "Guest slipped near drink station, no injury, incident report started").category === "incidents", "incidents");
  assert(classify("Close", "Close was heavy. DT SOS 8:20. Two call-outs on FOH.").category === "shift-notes", "shift-notes");
  assert(classify("Sunday", "Sarah requested Sunday off, update the week schedule and roster").category === "schedules", "schedules");
  assert(classify("Door", "Remember to check the back door").category === "general", "general");
  console.log("ok classify");
}

function testFileAndVerify() {
  const store = storeWithCatalog();
  const captured = captureNote(store, {
    actorEmail: OPERATOR_EMAIL,
    title: "Sysco short",
    body: "Sysco truck shorted 2 cases of nuggets, need a credit memo against the invoice.",
  });
  assert(captured.status === "inbox", "starts in inbox");

  const decision = proposeFiling(captured);
  assert(decision.category === "vendor", "file proposes vendor");
  assert(decision.destination.driveFolder === "Vendors", "Drive folder Vendors");
  assert(decision.destination.localPath === `filed/vendor/${captured.id}.json`, "local path");

  const pending = applyFiling(captured, decision);
  assert(pending.status === "pending-verify", "written filing is not committed until verify");

  const links = linkNote(pending, store.getCatalog(), store.listNotes());
  const verification = verifyFiling({
    note: { ...pending, links },
    decision,
    links,
    catalog: store.getCatalog(),
    roster: store.getRoster(),
  });
  assert(verification.ok, `expected verify pass: ${JSON.stringify(verification.checks)}`);
  const filed = commitVerified({ ...pending, links }, verification);
  assert(filed.status === "filed", "committed only after verify");
  console.log("ok file + verify pass");
}

function testVerifyCatchesWrongFiling() {
  const store = storeWithCatalog();
  const note = captureNote(store, {
    actorEmail: OPERATOR_EMAIL,
    title: "Sysco short",
    body: "Sysco truck shorted 2 cases, send the credit memo.",
  });
  const wrong: FilingDecision = {
    noteId: note.id,
    category: "training",
    confidence: 0.9,
    reasons: ["tampered"],
    destination: destinationFor("training", note.id),
  };
  const pending = applyFiling(note, wrong);
  const verification = verifyFiling({
    note: pending,
    decision: wrong,
    links: [],
    catalog: store.getCatalog(),
    roster: store.getRoster(),
  });
  assert(!verification.ok, "verify must fail when written category disagrees");
  const independent = verification.checks.find((c) => c.name === "independent-classify-agrees");
  assert(independent && !independent.ok, "independent classify check failed");
  assert(commitVerified(pending, verification).status === "needs-review", "failed verify stays review, not filed");
  console.log("ok verify catches wrong filing");
}

function testVerifyCatchesDestinationMismatch() {
  const store = storeWithCatalog();
  const note = captureNote(store, {
    actorEmail: OPERATOR_EMAIL,
    title: "Sysco short",
    body: "Sysco truck shorted 2 cases, send the credit memo.",
  });
  const decision = proposeFiling(note);
  const mismatched: FilingDecision = {
    ...decision,
    destination: { driveFolder: "Training", localPath: `filed/training/${note.id}.json` },
  };
  const verification = verifyFiling({
    note,
    decision: mismatched,
    links: [],
    catalog: store.getCatalog(),
    roster: store.getRoster(),
  });
  assert(!verification.ok, "destination mismatch must fail verify");
  console.log("ok verify catches destination mismatch");
}

function testLink() {
  const store = storeWithCatalog();
  const first = processNote(
    store,
    captureNote(store, {
      actorEmail: OPERATOR_EMAIL,
      title: "Sysco bread short",
      body: "Sysco invoice shorted bread. Check the order guide.",
    })
  );
  assert(first.note.status === "filed", "first vendor note filed");
  const syscoLink = first.links.find((link) => link.targetId === "drive-vendor-sysco");
  assert(syscoLink?.type === "drive-file", "links Sysco Drive file");
  assert(
    !first.links.some((link) => link.targetId === "drive-store-team-handbook"),
    "must not link the store-team handbook"
  );

  const second = processNote(
    store,
    captureNote(store, {
      actorEmail: OPERATOR_EMAIL,
      title: "Follow-up Sysco credit",
      body: "Need the Sysco credit memo for the bread short on that invoice.",
    })
  );
  assert(
    second.links.some((link) => link.type === "note" && link.targetId === first.note.id),
    "second vendor note links to the first"
  );

  const leakFile = catalog().find((file) => file.id === "drive-store-team-handbook");
  assert(leakFile && !isLinkableDriveFile(leakFile), "store-team file is not linkable");
  console.log("ok link");
}

function testPipelineRejectsStoreTeam() {
  const store = storeWithCatalog();
  for (const email of STORE_TEAM_DENYLIST) {
    const access = authorize(email, store.getRoster(), "capture");
    assert(access.code === "store-team-denied", `${email} must be store-team-denied`);
    let threw = false;
    try {
      captureNote(store, { actorEmail: email, title: "hi", body: "crew note" });
    } catch {
      threw = true;
    }
    assert(threw, `${email} cannot capture`);
    threw = false;
    try {
      readNotes(store, email);
    } catch {
      threw = true;
    }
    assert(threw, `${email} cannot read`);
  }

  let unknownThrew = false;
  try {
    captureNote(store, {
      actorEmail: "crew.member@store.local",
      title: "hi",
      body: "not a manager",
    });
  } catch {
    unknownThrew = true;
  }
  assert(unknownThrew, "unknown email cannot capture");
  console.log("ok access deny store team");
}

function testGrantSeats() {
  let roster = defaultRoster();
  const first = grantManagerSeat(roster, OPERATOR_EMAIL, {
    name: "Manager Two",
    email: "manager.two@example.com",
  });
  assert(first.ok, "grant seat 2");
  roster = first.ok ? first.roster : roster;

  const dup = grantManagerSeat(roster, "manager.two@example.com", {
    name: "Manager Two",
    email: "manager.two@example.com",
  });
  assert(!dup.ok, "duplicate email rejected");

  const crew = grantManagerSeat(roster, OPERATOR_EMAIL, {
    name: "Alex",
    email: "alex@store.com",
  });
  assert(!crew.ok, "cannot grant crew");

  const third = grantManagerSeat(roster, OPERATOR_EMAIL, {
    name: "Manager Three",
    email: "manager.three@example.com",
  });
  assert(third.ok, "grant seat 3");
  roster = third.ok ? third.roster : roster;

  const fourth = grantManagerSeat(roster, OPERATOR_EMAIL, {
    name: "Manager Four",
    email: "manager.four@example.com",
  });
  assert(fourth.ok, "grant seat 4");
  roster = fourth.ok ? fourth.roster : roster;

  const fifth = grantManagerSeat(roster, OPERATOR_EMAIL, {
    name: "Manager Five",
    email: "manager.five@example.com",
  });
  assert(!fifth.ok, "cannot expand past 4 managers");

  const plan = driveSharePlan(roster);
  assert(plan.anyoneWithLink === false, "no anyone-with-link");
  assert(plan.shareWithStoreTeam === false, "no store team share");
  assert(plan.shareWith.length === 4, "share with 4 managers");
  assert(
    plan.shareWith.every((person) => !(STORE_TEAM_DENYLIST as readonly string[]).includes(person.email)),
    "share plan excludes store team"
  );
  console.log("ok grant seats + share plan");
}

function testInboxDropAndProcess() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "second-brain-"));
  const store = new FileBrainStore(root);
  store.saveRoster(defaultRoster());
  store.saveCatalog(catalog());
  fs.writeFileSync(
    path.join(root, "inbox", "sysco-late.md"),
    `---
actor: ${OPERATOR_EMAIL}
title: Sysco late
---
Sysco truck was late and the invoice was shorted. Need a credit memo.
`
  );

  const results = processInbox(store, OPERATOR_EMAIL);
  assert(results.length === 1, "processed one dropped note");
  assert(results[0].note.status === "filed", "dropped note filed after verify");
  assert(results[0].note.category === "vendor", "classified vendor");
  assert(results[0].verification?.ok === true, "verification ran and passed");
  assert(
    fs.existsSync(path.join(root, "filed", "vendor", `${results[0].note.id}.json`)),
    "filed copy written"
  );
  console.log("ok inbox drop process");
}

function testVerifyBlocksLeakedDriveLink() {
  const store = storeWithCatalog();
  const note: CapturedNote = captureNote(store, {
    actorEmail: OPERATOR_EMAIL,
    title: "Sysco short",
    body: "Sysco truck shorted 2 cases, send the credit memo.",
  });
  const decision = proposeFiling(note);
  const leaked = [
    {
      type: "drive-file" as const,
      targetId: "drive-store-team-handbook",
      title: "Crew handbook",
      url: "https://drive.google.com/file/d/drive-store-team-handbook/view",
      score: 9,
      why: "should never stick",
    },
  ];
  const verification = verifyFiling({
    note: { ...note, links: leaked },
    decision,
    links: leaked,
    catalog: store.getCatalog(),
    roster: store.getRoster(),
  });
  assert(!verification.ok, "leaked store-team Drive link fails verify");
  console.log("ok verify blocks store-team Drive link");
}

function main() {
  testClassify();
  testFileAndVerify();
  testVerifyCatchesWrongFiling();
  testVerifyCatchesDestinationMismatch();
  testLink();
  testPipelineRejectsStoreTeam();
  testGrantSeats();
  testInboxDropAndProcess();
  testVerifyBlocksLeakedDriveLink();
  console.log("ok second-brain phase 1");
}

main();
