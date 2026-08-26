import { createL10Session, meetingProgress, mostRecentPrevious, prepProgress } from "../src/lib/l10/session";
import type { L10Session } from "../src/lib/l10/types";

function assert(cond: unknown, message: string) {
  if (!cond) throw new Error(message);
}

function previousSession(): L10Session {
  const session = createL10Session({
    id: "prev",
    scheduledAt: "2026-08-19T13:00:00.000Z",
    location: "Back office",
  });
  session.rocks = [
    {
      id: "rock-1",
      title: "Labor at or below 24%",
      owner: "Operator",
      status: "on_track",
      notes: "",
    },
    {
      id: "rock-done",
      title: "Hire closing leader",
      owner: "Operator",
      status: "done",
      notes: "Filled in July",
    },
  ];
session.todos = [
  {
    id: "todo-open",
    title: "Walk the 4:00 SOS dip",
    owner: "Director",
    dueDate: "2026-08-21",
    status: "open",
  },
  {
    id: "todo-blank",
    title: "   ",
    owner: "",
    dueDate: "",
    status: "open",
  },
  {
    id: "todo-done",
    title: "Send OSAT recap",
    owner: "Operator",
    dueDate: "2026-08-20",
    status: "done",
  },
];
  session.issues = [
    {
      id: "issue-open",
      title: "Afternoon DT backup",
      detail: "Cars stacking after 3:30",
      owner: "Director",
      rank: 1,
      solved: false,
      solution: "",
    },
    {
      id: "issue-solved",
      title: "Ice machine",
      detail: "",
      owner: "FBM",
      rank: null,
      solved: true,
      solution: "Replaced filter",
    },
  ];
  session.bringItems[0].packed = true;
  session.agenda[0].done = true;
  return session;
}

const previous = previousSession();
const next = createL10Session({
  scheduledAt: "2026-08-26T13:00:00.000Z",
  previous,
});

assert(next.status === "prep", "new sessions start in prep");
assert(next.location === "Back office", "location carries forward");
assert(next.rocks.length === 1 && next.rocks[0].title.includes("Labor"), "open rocks carry");
assert(next.todos.length === 1 && next.todos[0].title.includes("SOS"), "open to-dos carry");
assert(next.issues.length === 1 && next.issues[0].rank === null, "unsolved issues carry without rank");
assert(next.bringItems.length === 8 && next.bringItems.every((item) => !item.packed), "fresh bring list");
assert(next.agenda.length === 7 && next.agenda.every((section) => !section.done), "fresh agenda");
assert(prepProgress(previous).packed === 1, "prep packed count");
assert(meetingProgress(previous).done === 1, "agenda done count");
assert(next.title.startsWith("L10 ·"), `title ${next.title}`);

const older = createL10Session({
  id: "older",
  scheduledAt: "2026-08-26T12:00:00.000Z",
});
older.updatedAt = "2026-08-26T12:00:00.000Z";
older.rocks = [
  {
    id: "stale-rock",
    title: "Stale rock",
    owner: "Ops",
    status: "on_track",
    notes: "",
  },
];
const newer = createL10Session({
  id: "newer",
  scheduledAt: "2026-08-26T12:00:00.000Z",
});
newer.updatedAt = "2026-08-26T18:00:00.000Z";
newer.rocks = [
  {
    id: "fresh-rock",
    title: "Carryforward labor rock",
    owner: "Operator",
    status: "on_track",
    notes: "",
  },
];
const picked = mostRecentPrevious([older, newer]);
assert(picked?.id === "newer", `carry-forward should use last updated session, got ${picked?.id}`);

console.log("l10 session factory ok");
