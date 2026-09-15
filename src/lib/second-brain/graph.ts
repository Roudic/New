import { OPERATOR_EMAIL, OPERATOR_NAME } from "./access";
import { isLinkableDriveFile } from "./link";
import type {
  CapturedNote,
  DriveFile,
  KnowledgeLink,
  SecondBrainCategory,
} from "./types";

export const MAP_CATEGORY_COLORS: Record<string, string> = {
  "shift-notes": "#3b82f6",
  vendor: "#f59e0b",
  training: "#10b981",
  incidents: "#ef4444",
  schedules: "#8b5cf6",
  general: "#64748b",
  inbox: "#94a3b8",
  drive: "#38bdf8",
};

export interface BrainGraphNode {
  id: string;
  kind: "note" | "drive";
  title: string;
  group: string;
  category?: string;
  status?: string;
  body?: string;
  actorEmail?: string;
  demo?: boolean;
  url?: string;
}

export interface BrainGraphLink {
  source: string;
  target: string;
  kind: "note" | "drive";
  why?: string;
}

export interface BrainGraph {
  nodes: BrainGraphNode[];
  links: BrainGraphLink[];
  demo: boolean;
  driveNodeCount: number;
}

const DEMO_PREFIX = "map-demo-";

function demoNote(
  id: string,
  title: string,
  body: string,
  category: SecondBrainCategory,
  links: KnowledgeLink[]
): CapturedNote {
  return {
    id: `${DEMO_PREFIX}${id}`,
    actorEmail: OPERATOR_EMAIL,
    actorName: OPERATOR_NAME,
    title,
    body,
    source: "note",
    capturedAt: "2026-09-15T12:00:00.000Z",
    status: "filed",
    category,
    links,
    filing: {
      noteId: `${DEMO_PREFIX}${id}`,
      category,
      confidence: 0.9,
      reasons: ["map demo"],
      destination: {
        driveFolder: category,
        localPath: `notes/${category}/${id}.json`,
      },
    },
  };
}

function demoLink(targetId: string, title: string, why: string): KnowledgeLink {
  return {
    type: "note",
    targetId: `${DEMO_PREFIX}${targetId}`,
    title,
    score: 4,
    why,
  };
}

/** In-memory notes so an empty store still shows a few note↔note clusters. Never Drive nodes. */
export const MAP_DEMO_NOTES: CapturedNote[] = [
  demoNote(
    "sysco-credit",
    "Sysco short — credit memo",
    "Sysco truck shorted 2 cases of nuggets. Send the credit memo to the distributor.",
    "vendor",
    [demoLink("sysco-invoice", "Sysco invoice shorted", "shared terms: sysco, shorted")]
  ),
  demoNote(
    "sysco-invoice",
    "Sysco invoice shorted",
    "Sysco delivery invoice was shorted again. Call the distributor about the credit.",
    "vendor",
    [demoLink("sysco-credit", "Sysco short — credit memo", "shared terms: sysco, shorted")]
  ),
  demoNote(
    "newhire-pathway",
    "New hire food safety pathway",
    "New hire onboarding: food safety video and pathway progress this week.",
    "training",
    [demoLink("newhire-shadow", "New hire shadowing trainer", "shared terms: new, hire")]
  ),
  demoNote(
    "newhire-shadow",
    "New hire shadowing trainer",
    "New hire is shadowing the trainer on grill during orientation.",
    "training",
    [demoLink("newhire-pathway", "New hire food safety pathway", "shared terms: new, hire")]
  ),
  demoNote(
    "shift-window",
    "Drive-thru window time",
    "Drive-thru window time was slow. Two call-outs on the close.",
    "shift-notes",
    [demoLink("incident-refund", "Wrong order refund", "shared terms: window")]
  ),
  demoNote(
    "incident-refund",
    "Wrong order refund",
    "Guest complaint: wrong order refund at the window.",
    "incidents",
    [demoLink("shift-window", "Drive-thru window time", "shared terms: window")]
  ),
];

function isRejected(note: CapturedNote): boolean {
  return note.status === "rejected";
}

function noteLinkCount(notes: CapturedNote[]): number {
  let count = 0;
  for (const note of notes) {
    if (isRejected(note)) continue;
    for (const link of note.links) {
      if (link.type === "note") count += 1;
    }
  }
  return count;
}

function filedishCount(notes: CapturedNote[]): number {
  let count = 0;
  for (const note of notes) {
    if (note.status === "filed" || note.status === "needs-review") count += 1;
  }
  return count;
}

export function shouldOverlayMapDemo(notes: CapturedNote[]): boolean {
  const visible: CapturedNote[] = [];
  for (const note of notes) {
    if (!isRejected(note)) visible.push(note);
  }
  return filedishCount(visible) < 3 || noteLinkCount(visible) < 2;
}

function groupForNote(note: CapturedNote): string {
  if (note.status === "inbox") return "inbox";
  return note.category ?? "general";
}

function catalogById(catalog: DriveFile[]): Record<string, DriveFile> {
  const map: Record<string, DriveFile> = {};
  for (const file of catalog) {
    map[file.id] = file;
  }
  return map;
}

function edgeKey(a: string, b: string): string {
  return a < b ? `${a}::${b}` : `${b}::${a}`;
}

export function buildBrainGraph(
  notes: CapturedNote[],
  catalog: DriveFile[]
): BrainGraph {
  const visible: CapturedNote[] = [];
  for (const note of notes) {
    if (!isRejected(note)) visible.push(note);
  }

  const demo = shouldOverlayMapDemo(visible);
  const byId: Record<string, CapturedNote> = {};
  for (const note of visible) {
    byId[note.id] = note;
  }
  if (demo) {
    for (const note of MAP_DEMO_NOTES) {
      if (!byId[note.id]) byId[note.id] = note;
    }
  }

  const files = catalogById(catalog);
  const nodes: BrainGraphNode[] = [];
  const seenNode: Record<string, true> = {};
  const links: BrainGraphLink[] = [];
  const seenEdge: Record<string, true> = {};

  function addNoteNode(note: CapturedNote) {
    if (seenNode[note.id]) return;
    seenNode[note.id] = true;
    const isDemo = note.id.indexOf(DEMO_PREFIX) === 0;
    nodes.push({
      id: note.id,
      kind: "note",
      title: note.title || "Untitled",
      group: groupForNote(note),
      category: note.category,
      status: note.status,
      body: note.body,
      actorEmail: note.actorEmail,
      demo: isDemo,
    });
  }

  function addDriveNode(file: DriveFile) {
    if (!isLinkableDriveFile(file)) return;
    if (seenNode[file.id]) return;
    seenNode[file.id] = true;
    nodes.push({
      id: file.id,
      kind: "drive",
      title: file.name,
      group: "drive",
      url: file.webViewLink,
      demo: false,
    });
  }

  function addEdge(
    source: string,
    target: string,
    kind: "note" | "drive",
    why?: string
  ) {
    if (source === target) return;
    if (!seenNode[source] || !seenNode[target]) return;
    const key = edgeKey(source, target);
    if (seenEdge[key]) return;
    seenEdge[key] = true;
    links.push({ source, target, kind, why });
  }

  const allNotes: CapturedNote[] = [];
  for (const id in byId) {
    if (Object.prototype.hasOwnProperty.call(byId, id)) {
      allNotes.push(byId[id]);
    }
  }

  for (const note of allNotes) {
    addNoteNode(note);
  }

  for (const note of allNotes) {
    for (const link of note.links) {
      if (link.type === "note") {
        const other = byId[link.targetId];
        if (!other) continue;
        addNoteNode(other);
        addEdge(note.id, other.id, "note", link.why);
        continue;
      }
      if (link.type !== "drive-file") continue;
      const file = files[link.targetId];
      if (!file || !isLinkableDriveFile(file)) continue;
      addDriveNode(file);
      addEdge(note.id, file.id, "drive", link.why);
    }
  }

  let driveNodeCount = 0;
  for (const node of nodes) {
    if (node.kind === "drive") driveNodeCount += 1;
  }

  return { nodes, links, demo, driveNodeCount };
}
