import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  applyFiling,
  authenticateManager,
  authorize,
  INVALID_CREDENTIALS_REASON,
  buildBrainGraph,
  createSimNodes,
  fibonacciSphere,
  pickProjectedNode,
  projectNodes,
  captureNote,
  classify,
  commitVerified,
  confirmDriveShare,
  defaultRoster,
  destinationFor,
  driveSharePlan,
  FileBrainStore,
  grantManagerSeat,
  isLinkableDriveFile,
  isSimulatedDriveFile,
  linkNote,
  MemoryBrainStore,
  MAP_DEMO_NOTES,
  OPERATOR_EMAIL,
  processInbox,
  processNote,
  proposeFiling,
  readManagerSession,
  readNotes,
  reviewClassify,
  signManagerSession,
  stepForce,
  STORE_TEAM_DENYLIST,
  verifyFiling,
  type CapturedNote,
  type DriveFile,
  type FilingDecision,
} from "../src/lib/second-brain";

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

function simulatedCatalog(): DriveFile[] {
  return [
    {
      id: "drive-sop-food-safety",
      name: "Food Safety SOP",
      webViewLink: "https://drive.google.com/file/d/drive-sop-food-safety/view",
      folder: "SOPs",
      keywords: ["food safety", "sop", "temperature", "incident"],
      managerShared: true,
      visibility: "managers-only",
      simulated: true,
    },
    {
      id: "drive-vendor-sysco",
      name: "Sysco order guide",
      webViewLink: "https://drive.google.com/file/d/drive-vendor-sysco/view",
      folder: "Vendors",
      keywords: ["sysco", "invoice", "order guide", "credit memo"],
      managerShared: true,
      visibility: "managers-only",
      simulated: true,
    },
    {
      id: "drive-vendor-beverage",
      name: "Beverage contract 2024",
      webViewLink: "https://drive.google.com/file/d/drive-vendor-beverage/view",
      folder: "Vendors",
      keywords: ["pepsi", "beverage", "coke"],
      managerShared: true,
      visibility: "managers-only",
      simulated: true,
    },
    {
      id: "drive-training-pathway",
      name: "Team Member Pathway",
      webViewLink: "https://drive.google.com/file/d/drive-training-pathway/view",
      folder: "Training",
      keywords: ["pathway", "trainee", "onboarding", "new hire"],
      managerShared: true,
      visibility: "managers-only",
      simulated: true,
    },
    {
      id: "drive-week-schedule",
      name: "Week schedule",
      webViewLink: "https://drive.google.com/file/d/drive-week-schedule/view",
      folder: "Schedules",
      keywords: ["schedule", "roster", "availability"],
      managerShared: true,
      visibility: "managers-only",
      simulated: true,
    },
    {
      id: "drive-store-team-handbook",
      name: "Crew handbook",
      webViewLink: "https://drive.google.com/file/d/drive-store-team-handbook/view",
      folder: "Store Team",
      keywords: ["sysco", "invoice", "training", "schedule", "shift", "pathway"],
      managerShared: false,
      visibility: "store-team",
      simulated: true,
    },
  ];
}

function storeWithCatalog() {
  return new MemoryBrainStore(defaultRoster(), simulatedCatalog());
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
  assert(!links.some((link) => link.type === "drive-file"), "pipeline must not attach placeholder Drive IDs");

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
  const independent = verification.checks.find((c) => c.name === "second-scorer-agrees");
  assert(independent && !independent.ok, "second scorer check failed");
  assert(commitVerified(pending, verification).status === "needs-review", "failed verify stays review, not filed");
  console.log("ok verify catches wrong filing");
}

function testVerifyIsIndependent() {
  const title = "Close";
  const body = "Close was fine, no injury, no incident, just a quiet night";
  const first = classify(title, body);
  const second = reviewClassify(title, body);
  assert(first.category === "incidents", "keyword classify still sees injury/incident");
  assert(second.category !== first.category, "second scorer must be able to disagree");
  assert(second.category === "shift-notes", "negation-aware scorer prefers shift-notes");

  const store = storeWithCatalog();
  const result = processNote(
    store,
    captureNote(store, { actorEmail: OPERATOR_EMAIL, title, body })
  );
  assert(result.note?.status === "needs-review", "disagreement holds the note for review");

  const general = processNote(
    store,
    captureNote(store, {
      actorEmail: OPERATOR_EMAIL,
      title: "Door",
      body: "Remember to check the back door",
    })
  );
  assert(general.note?.status === "needs-review", "general stays in needs-review");
  console.log("ok verify independent second scorer");
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
  assert(first.note?.status === "filed", "first vendor note filed");
  assert(
    !first.links.some((link) => link.type === "drive-file"),
    "live pipeline must not attach simulated Drive URLs"
  );

  const scored = linkNote(
    { ...(first.note as CapturedNote), category: "vendor" },
    simulatedCatalog(),
    [],
    { allowSimulated: true }
  );
  assert(
    scored.some((link) => link.targetId === "drive-vendor-sysco"),
    "fixture matcher still finds Sysco when allowSimulated"
  );
  assert(
    !scored.some((link) => link.targetId === "drive-store-team-handbook"),
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
    second.links.some((link) => link.type === "note" && link.targetId === first.note?.id),
    "second vendor note links to the first"
  );

  const leakFile = simulatedCatalog().find((file) => file.id === "drive-store-team-handbook");
  assert(leakFile && !isLinkableDriveFile(leakFile), "store-team file is not linkable");
  assert(leakFile && isSimulatedDriveFile(leakFile), "placeholder catalog files are simulated");
  console.log("ok link");
}

function testFolderOnlyLinks() {
  const note: CapturedNote = {
    id: "n1",
    actorEmail: OPERATOR_EMAIL,
    title: "Sysco short",
    body: "Sysco truck shorted 2 cases of nuggets, need a credit memo.",
    source: "note",
    capturedAt: new Date().toISOString(),
    status: "pending-verify",
    category: "vendor",
    links: [],
  };
  const links = linkNote(note, simulatedCatalog(), [], { allowSimulated: true });
  assert(
    links.some((link) => link.targetId === "drive-vendor-sysco"),
    "Sysco order guide still links on shared terms"
  );
  assert(
    !links.some((link) => link.targetId === "drive-vendor-beverage"),
    "folder-only +2 must not link Beverage contract 2024"
  );
  console.log("ok folder-only links refused");
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

function testGrantBeforeShare() {
  let roster = defaultRoster();
  const first = grantManagerSeat(roster, OPERATOR_EMAIL, {
    name: "Manager Two",
    email: "manager.two@example.com",
  });
  assert(first.ok, "grant seat 2");
  if (!first.ok) return;
  roster = first.roster;
  assert(first.seat.status === "pending-invite", "grant does not activate");
  assert(first.seat.driveShareConfirmed === false, "share not confirmed");

  const pendingAccess = authorize("manager.two@example.com", roster, "capture");
  assert(pendingAccess.code === "pending-seat", "granted manager cannot capture yet");

  const store = new MemoryBrainStore(roster, []);
  let captureThrew = false;
  try {
    captureNote(store, {
      actorEmail: "manager.two@example.com",
      title: "hi",
      body: "Sysco truck shorted bread",
    });
  } catch {
    captureThrew = true;
  }
  assert(captureThrew, "grant-before-share cannot capture");

  const blocked = confirmDriveShare(roster, OPERATOR_EMAIL, "manager.two@example.com");
  assert(!blocked.ok, "confirm-share fails closed without a Drive folder id");

  const planted = {
    ...roster,
    driveFolder: { ...roster.driveFolder, id: "1A2b3C4d5E6f7G8h9I0jKLMNO-pqrs" },
  };
  const plantedConfirm = confirmDriveShare(
    planted,
    OPERATOR_EMAIL,
    "manager.two@example.com"
  );
  assert(!plantedConfirm.ok, "planted folder id is not proof of Drive share");
  assert(
    plantedConfirm.ok === false && plantedConfirm.error.includes("Live Drive ACL"),
    "error names unwired ACL"
  );
  assert(
    authorize("manager.two@example.com", planted, "capture").code === "pending-seat",
    "seat stays pending after planted id"
  );

  const dup = grantManagerSeat(roster, OPERATOR_EMAIL, {
    name: "Manager Two",
    email: "manager.two@example.com",
  });
  assert(!dup.ok, "duplicate email rejected");

  const crew = grantManagerSeat(roster, OPERATOR_EMAIL, {
    name: "Alex",
    email: "alex@store.com",
  });
  assert(!crew.ok, "cannot grant crew");

  let filling = roster;
  const third = grantManagerSeat(filling, OPERATOR_EMAIL, {
    name: "Manager Three",
    email: "manager.three@example.com",
  });
  assert(third.ok, "grant seat 3");
  filling = third.ok ? third.roster : filling;
  const fourth = grantManagerSeat(filling, OPERATOR_EMAIL, {
    name: "Manager Four",
    email: "manager.four@example.com",
  });
  assert(fourth.ok, "grant seat 4");
  filling = fourth.ok ? fourth.roster : filling;
  const fifth = grantManagerSeat(filling, OPERATOR_EMAIL, {
    name: "Manager Five",
    email: "manager.five@example.com",
  });
  assert(!fifth.ok, "cannot expand past 4 managers");

  const plan = driveSharePlan({
    ...filling,
    driveFolder: { ...filling.driveFolder, id: "1A2b3C4d5E6f7G8h9I0jKLMNO-pqrs" },
  });
  assert(plan.anyoneWithLink === false, "no anyone-with-link");
  assert(plan.shareWithStoreTeam === false, "no store team share");
  assert(plan.shareWith.length === 1, "only Joshua is active; planted id does not confirm others");
  assert(plan.awaitingDriveShare.length === 3, "unconfirmed grants await Drive share");
  assert(plan.live === false, "plan.live stays false without live Drive ACL");
  console.log("ok grant stays pending; planted folder id is not share proof");
}

function testInboxDropAndProcess() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "second-brain-"));
  const store = new FileBrainStore(root);
  store.saveRoster(defaultRoster());
  fs.writeFileSync(
    path.join(root, "inbox", "sysco-late.md"),
    `---
title: Sysco late
---
Sysco truck was late and the invoice was shorted. Need a credit memo.
`
  );

  const results = processInbox(store, OPERATOR_EMAIL);
  const processed = results.find((result) => result.note);
  assert(processed?.note?.status === "filed", "dropped note filed after verify");
  assert(processed?.note?.category === "vendor", "classified vendor");
  assert(processed?.note?.actorEmail === OPERATOR_EMAIL, "identity is the processor, not frontmatter");
  assert(processed?.verification?.ok === true, "verification ran and passed");
  assert(
    fs.existsSync(path.join(root, "filed", "vendor", `${processed?.note?.id}.json`)),
    "filed copy written"
  );
  console.log("ok inbox drop process");
}

function testSpoofedDrops() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "second-brain-"));
  const store = new FileBrainStore(root);
  store.saveRoster(defaultRoster());

  fs.writeFileSync(
    path.join(root, "inbox", "crew-spoof.md"),
    `---
actor: alex@store.com
title: Crew leak
---
SECRET_CREW_BODY should never be stored
`
  );
  fs.writeFileSync(
    path.join(root, "inbox", "joshua-claim.md"),
    `---
actor: ${OPERATOR_EMAIL}
title: Spoof Joshua
---
SPOOF_JOSHUA_BODY if frontmatter were trusted without the process actor
`
  );
  fs.writeFileSync(
    path.join(root, "inbox", "other-manager.md"),
    `---
actor: manager.two@example.com
title: Other manager claim
---
OTHER_MANAGER_BODY
`
  );

  const results = processInbox(store, OPERATOR_EMAIL);
  const discarded = results.filter((result) => result.discarded);
  assert(discarded.length === 2, "unknown/spoofed claimed actors are discarded");
  assert(
    discarded.some((result) => result.discarded?.claimedActor === "alex@store.com"),
    "crew spoof discarded"
  );
  assert(
    discarded.some((result) => result.discarded?.claimedActor === "manager.two@example.com"),
    "ungranted email discarded"
  );

  const notes = readNotes(store, OPERATOR_EMAIL);
  const blob = JSON.stringify(notes);
  assert(!blob.includes("SECRET_CREW_BODY"), "crew body not persisted");
  assert(!blob.includes("OTHER_MANAGER_BODY"), "ungranted manager body not persisted");

  const matching = results.find((result) => result.note?.title === "Spoof Joshua");
  assert(matching?.note?.actorEmail === OPERATOR_EMAIL, "matching claim still uses processor");
  assert(matching?.note?.status === "needs-review" || matching?.note?.status === "filed", "matching drop is processed");
  console.log("ok spoofed drops discarded");
}

function testGrantedManagerInboxDrop() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "second-brain-"));
  const store = new FileBrainStore(root);
  const granted = grantManagerSeat(defaultRoster(), OPERATOR_EMAIL, {
    name: "Manager Two",
    email: "manager.two@example.com",
  });
  assert(granted.ok, "grant manager two");
  if (!granted.ok) return;
  store.saveRoster(granted.roster);

  fs.writeFileSync(
    path.join(root, "inbox", "two-sysco.md"),
    `---
actor: manager.two@example.com
title: Sysco late
---
Sysco truck was late and the invoice was shorted. Need a credit memo.
`
  );
  fs.writeFileSync(
    path.join(root, "inbox", "unclaimed.md"),
    `---
title: Unclaimed sysco
---
Sysco shorted bread, send the credit memo.
`
  );

  const results = processInbox(store, OPERATOR_EMAIL);
  assert(
    !results.some((result) => result.discarded),
    "granted-manager drop must not be discarded"
  );

  const two = results.find((result) => result.note?.title === "Sysco late");
  assert(two?.note?.actorEmail === "manager.two@example.com", "attributed to granted manager");
  assert(two?.note?.status === "filed", "pending manager drop is filed, not deleted");
  assert(two?.note?.body.includes("invoice was shorted"), "body kept");

  const unclaimed = results.find((result) => result.note?.title === "Unclaimed sysco");
  assert(unclaimed?.note?.actorEmail === OPERATOR_EMAIL, "unclaimed drop stays the processor");

  const notes = readNotes(store, OPERATOR_EMAIL);
  const blob = JSON.stringify(notes);
  assert(blob.includes("invoice was shorted"), "granted manager body readable");
  assert(blob.includes("Sysco shorted bread"), "unclaimed body readable");
  console.log("ok granted manager inbox drop kept");
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

function assertInvalidCredentials(
  result: ReturnType<typeof authenticateManager>,
  label: string
) {
  assert(!result.ok, `${label}: must fail`);
  assert(
    result.code === "invalid-credentials",
    `${label}: code must be invalid-credentials, got ${result.code}`
  );
  assert(
    result.reason === INVALID_CREDENTIALS_REASON,
    `${label}: reason must not leak identity, got ${result.reason}`
  );
}

function testManagerDashboardAuth() {
  const prevPassword = process.env.SECOND_BRAIN_PASSWORD;
  const prevBrainSecret = process.env.SECOND_BRAIN_SECRET;
  const prevNextSecret = process.env.NEXTAUTH_SECRET;
  process.env.SECOND_BRAIN_PASSWORD = "hueytown-managers";
  process.env.SECOND_BRAIN_SECRET = "unit-brain-secret";
  process.env.NEXTAUTH_SECRET = "unit-nextauth-secret";
  try {
    const roster = defaultRoster();
    const ok = authenticateManager(OPERATOR_EMAIL, "hueytown-managers", roster);
    assert(ok.ok && ok.email === OPERATOR_EMAIL, "Joshua can sign in");
    const token = signManagerSession(ok.email);
    assert(readManagerSession(token) === OPERATOR_EMAIL, "session round-trips");

    const leakCases = [
      ["alex@store.com", "wrong-password", "store-team wrong password"],
      ["alex@store.com", "hueytown-managers", "store-team correct password"],
      ["sam@store.com", "hueytown-managers", "other crew correct password"],
      ["admin@joltcheck.com", "hueytown-managers", "JoltCheck admin correct password"],
      ["x@y.com", "wrong-password", "unknown wrong password"],
      ["x@y.com", "hueytown-managers", "unknown correct password"],
      [OPERATOR_EMAIL, "admin123", "Joshua wrong password"],
      [OPERATOR_EMAIL, "wrong-password", "Joshua another wrong password"],
    ] as const;
    for (const [email, password, label] of leakCases) {
      assertInvalidCredentials(authenticateManager(email, password, roster), label);
    }

    const granted = grantManagerSeat(roster, OPERATOR_EMAIL, {
      name: "Manager Two",
      email: "manager.two@example.com",
    });
    assert(granted.ok, "grant pending manager for login leak test");
    if (!granted.ok) return;
    const pendingWrong = authenticateManager(
      "manager.two@example.com",
      "wrong-password",
      granted.roster
    );
    const pendingCorrect = authenticateManager(
      "manager.two@example.com",
      "hueytown-managers",
      granted.roster
    );
    const unknownCorrect = authenticateManager(
      "x@y.com",
      "hueytown-managers",
      granted.roster
    );
    assertInvalidCredentials(pendingWrong, "pending seat wrong password");
    assertInvalidCredentials(
      pendingCorrect,
      "pending seat correct password must not prove the password or the seat"
    );
    assert(
      pendingCorrect.code === unknownCorrect.code &&
        pendingCorrect.reason === unknownCorrect.reason,
      "pending+correct password must match unknown+correct password"
    );
    assert(
      authorize("manager.two@example.com", granted.roster, "capture").code ===
        "pending-seat",
      "authorize still holds the seat pending until live Drive ACL"
    );

    delete process.env.SECOND_BRAIN_SECRET;
    process.env.NEXTAUTH_SECRET = "unit-brain-secret";
    const noFallback = authenticateManager(
      OPERATOR_EMAIL,
      "hueytown-managers",
      roster
    );
    assert(
      noFallback.code === "password-not-configured",
      "login requires SECOND_BRAIN_SECRET; NEXTAUTH_SECRET is not a fallback"
    );
    assert(
      readManagerSession(token) === null,
      "session HMAC must not accept NEXTAUTH_SECRET even when it matches the old key"
    );
  } finally {
    if (prevPassword === undefined) delete process.env.SECOND_BRAIN_PASSWORD;
    else process.env.SECOND_BRAIN_PASSWORD = prevPassword;
    if (prevBrainSecret === undefined) delete process.env.SECOND_BRAIN_SECRET;
    else process.env.SECOND_BRAIN_SECRET = prevBrainSecret;
    if (prevNextSecret === undefined) delete process.env.NEXTAUTH_SECRET;
    else process.env.NEXTAUTH_SECRET = prevNextSecret;
  }
  console.log("ok manager dashboard auth does not leak password correctness");
}

function testDoesNotTreatPlaceholderCatalogAsLive() {
  const store = storeWithCatalog();
  const note = captureNote(store, {
    actorEmail: OPERATOR_EMAIL,
    title: "Sysco short",
    body: "Sysco truck shorted 2 cases, send the credit memo.",
  });
  const decision = proposeFiling(note);
  const fakeLink = [
    {
      type: "drive-file" as const,
      targetId: "drive-vendor-sysco",
      title: "Sysco order guide",
      url: "https://drive.google.com/file/d/drive-vendor-sysco/view",
      score: 9,
      why: "placeholder",
    },
  ];
  const verification = verifyFiling({
    note: { ...note, links: fakeLink },
    decision,
    links: fakeLink,
    catalog: store.getCatalog(),
    roster: store.getRoster(),
  });
  assert(!verification.ok, "placeholder Drive IDs fail closed");
  const simulated = verification.checks.find((item) => item.name === "no-simulated-drive-links");
  assert(simulated && !simulated.ok, "simulated Drive check failed");
  console.log("ok placeholder Drive IDs fail closed");
}

function testBrainMapGraph() {
  const empty = buildBrainGraph([], []);
  assert(empty.demo, "empty store overlays demo notes");
  assert(empty.nodes.length >= 6, "demo has a few note nodes");
  assert(empty.driveNodeCount === 0, "demo graph has no Drive nodes");
  assert(
    empty.nodes.every((node) => node.kind === "note"),
    "demo nodes are notes only"
  );
  assert(empty.links.length >= 3, "demo notes are linked to each other");
  assert(
    empty.links.every((link) => link.kind === "note"),
    "demo edges are note↔note"
  );
  const groups: Record<string, true> = {};
  for (const node of empty.nodes) {
    groups[node.group] = true;
  }
  assert(groups.vendor && groups.training && groups.incidents && groups["shift-notes"], "categories group demo nodes");

  const simulatedNote: CapturedNote = {
    ...MAP_DEMO_NOTES[0],
    id: "real-sysco",
    links: [
      {
        type: "drive-file",
        targetId: "drive-vendor-sysco",
        title: "Sysco order guide",
        url: "https://drive.google.com/file/d/drive-vendor-sysco/view",
        score: 9,
        why: "simulated",
      },
    ],
  };
  const simulatedGraph = buildBrainGraph([simulatedNote], simulatedCatalog());
  assert(simulatedGraph.driveNodeCount === 0, "simulated Drive catalog does not appear on the map");
  assert(
    simulatedGraph.nodes.every((node) => node.kind !== "drive"),
    "no Drive nodes from placeholder ids"
  );

  const liveId = "1bKpxLqR8nM2vT9cW4yH7sF3dXa0Qzz";
  const liveFile: DriveFile = {
    id: liveId,
    name: "Live Sysco order guide",
    webViewLink: `https://drive.google.com/file/d/${liveId}/view`,
    folder: "Vendors",
    keywords: ["sysco"],
    managerShared: true,
    visibility: "managers-only",
  };
  const liveNote: CapturedNote = {
    ...MAP_DEMO_NOTES[0],
    id: "live-sysco-note",
    status: "filed",
    category: "vendor",
    links: [
      {
        type: "drive-file",
        targetId: liveId,
        title: "Live Sysco order guide",
        url: liveFile.webViewLink,
        score: 8,
        why: "live catalog",
      },
      {
        type: "note",
        targetId: "live-sysco-sibling",
        title: "Sibling",
        score: 3,
        why: "related",
      },
    ],
  };
  const sibling: CapturedNote = {
    ...MAP_DEMO_NOTES[1],
    id: "live-sysco-sibling",
    status: "filed",
    category: "vendor",
    links: [
      {
        type: "note",
        targetId: "live-sysco-note",
        title: "Live note",
        score: 3,
        why: "related",
      },
    ],
  };
  const third: CapturedNote = {
    ...MAP_DEMO_NOTES[2],
    id: "live-training-note",
    status: "filed",
    category: "training",
    links: [
      {
        type: "note",
        targetId: "live-sysco-sibling",
        title: "Sibling",
        score: 2,
        why: "related",
      },
    ],
  };
  const liveGraph = buildBrainGraph([liveNote, sibling, third], [liveFile]);
  assert(!liveGraph.demo, "enough real linked notes skip the demo overlay");
  assert(liveGraph.driveNodeCount === 1, "live catalog file can appear");
  assert(
    liveGraph.nodes.some((node) => node.id === liveId && node.kind === "drive"),
    "live Drive node id matches the catalog file"
  );
  assert(
    liveGraph.links.some(
      (link) =>
        link.kind === "drive" &&
        (link.source === liveId || link.target === liveId)
    ),
    "note↔Drive edge only for the live file"
  );
  assert(
    !liveGraph.nodes.some((node) => node.id.indexOf("map-demo-") === 0),
    "demo overlay omitted when real graph is dense enough"
  );
  console.log("ok 3D brain map graph (no fake Drive)");
}

function testBrainMapView() {
  const graph = buildBrainGraph([], []);
  const sim = createSimNodes(graph.nodes);
  assert(sim.length === graph.nodes.length && sim.length >= 6, "sim nodes match graph");
  const seeds = fibonacciSphere(sim.length, 150);
  const keys: Record<string, true> = {};
  for (let i = 0; i < seeds.length; i += 1) {
    const key = `${Math.round(seeds[i].x)}:${Math.round(seeds[i].y)}:${Math.round(seeds[i].z)}`;
    assert(!keys[key], "sphere seeds are distinct");
    keys[key] = true;
  }
  for (let i = 0; i < 40; i += 1) stepForce(sim, graph.links, 0.9);
  const projected = projectNodes(sim, 0.4, 0.2, 420, 800, 500);
  assert(projected.length === sim.length, "every note is projected");
  const front = projected[projected.length - 1];
  const hit = pickProjectedNode(projected, front.sx, front.sy);
  assert(hit && hit.id === front.node.id, "click picks the visible note");
  console.log("ok canvas 2.5D map view");
}

function main() {
  testClassify();
  testFileAndVerify();
  testVerifyCatchesWrongFiling();
  testVerifyIsIndependent();
  testVerifyCatchesDestinationMismatch();
  testLink();
  testFolderOnlyLinks();
  testPipelineRejectsStoreTeam();
  testGrantBeforeShare();
  testInboxDropAndProcess();
  testSpoofedDrops();
  testGrantedManagerInboxDrop();
  testVerifyBlocksLeakedDriveLink();
  testDoesNotTreatPlaceholderCatalogAsLive();
  testManagerDashboardAuth();
  testBrainMapGraph();
  testBrainMapView();
  console.log("ok second-brain phase 1");
}

main();
