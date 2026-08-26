"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Check,
  Plus,
  Trash2,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { BringList } from "@/components/l10/BringList";
import { SaveIndicator } from "@/components/l10/SaveIndicator";
import { ScorecardStrip } from "@/components/l10/ScorecardStrip";
import { StatusBadge } from "@/components/l10/StatusBadge";
import { useApp } from "@/context/AppContext";
import { L10_AGENDA, STATUS_LABEL } from "@/lib/l10/defaults";
import { meetingProgress, prepProgress } from "@/lib/l10/session";
import {
  L10_STATUSES,
  type Headline,
  type HeadlineKind,
  type Issue,
  type L10Session,
  type L10Status,
  type Rock,
  type RockStatus,
  type TodoItem,
  type TodoStatus,
} from "@/lib/l10/types";
import { generateId } from "@/lib/utils";
import { useL10 } from "@/lib/useL10";

type Tab = "prep" | "meeting" | "followup";

function toDatetimeLocal(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function SessionClient({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const { hydrated, isLoggedIn } = useApp();
  const { sessions, loading, updateSession, deleteSession, saveState, lastSavedAt, isCloud } =
    useL10();
  const [tab, setTab] = useState<Tab>("prep");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    if (!isLoggedIn) router.replace("/login");
  }, [hydrated, isLoggedIn, router]);

  const session = sessions.find((item) => item.id === sessionId);

  useEffect(() => {
    if (!loading && hydrated && isLoggedIn && sessions.length > 0 && !session) {
      router.replace("/l10");
    }
  }, [hydrated, isLoggedIn, loading, router, session, sessions.length]);

  const patch = (draft: Partial<L10Session>) => {
    updateSession(sessionId, draft);
  };

  if (!hydrated || !isLoggedIn || loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-slate-500">
        Loading session…
      </div>
    );
  }

  const prep = prepProgress(session);
  const meeting = meetingProgress(session);

  return (
    <AppShell wide>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link
            href="/l10"
            className="mb-3 inline-flex text-sm font-medium text-slate-500 hover:text-slate-800"
          >
            ← All L10 sessions
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">{session.title}</h1>
            <StatusBadge status={session.status} />
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Prep {prep.packed}/{prep.total} packed · Agenda {meeting.done}/{meeting.total} ·{" "}
            {session.location || "No location set"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SaveIndicator saveState={saveState} lastSavedAt={lastSavedAt} isCloud={isCloud} />
          {confirmDelete ? (
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-danger py-2"
                onClick={async () => {
                  await deleteSession(session.id);
                  router.push("/l10");
                }}
              >
                Delete session
              </button>
              <button type="button" className="btn-secondary py-2" onClick={() => setConfirmDelete(false)}>
                Cancel
              </button>
            </div>
          ) : (
            <button type="button" className="btn-secondary py-2" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          )}
        </div>
      </div>

      <nav className="mb-6 flex gap-1 overflow-x-auto rounded-2xl border border-rose-100 bg-white/90 p-1 shadow-sm">
        {(
          [
            ["prep", "Prep"],
            ["meeting", "Meeting"],
            ["followup", "Follow-up"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold ${
              tab === id ? "bg-cfa text-white shadow-sm" : "text-slate-600 hover:bg-rose-50"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === "prep" && <PrepTab session={session} patch={patch} />}
      {tab === "meeting" && <MeetingTab session={session} patch={patch} />}
      {tab === "followup" && <FollowupTab session={session} patch={patch} />}
    </AppShell>
  );
}

function PrepTab({
  session,
  patch,
}: {
  session: L10Session;
  patch: (draft: Partial<L10Session>) => void;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <section className="glass-panel p-5">
        <h2 className="section-title">What to bring</h2>
        <p className="mb-4 mt-1 text-sm text-slate-500">
          Check it off as you pack it. Add anything else this week&apos;s L10 needs.
        </p>
        <BringList items={session.bringItems} onChange={(bringItems) => patch({ bringItems })} />
      </section>

      <div className="space-y-6">
        <section className="glass-panel p-5">
          <h2 className="section-title">Session details</h2>
          <div className="mt-4 space-y-4">
            <label className="block">
              <span className="field-label">Title</span>
              <input
                className="field-input"
                value={session.title}
                onChange={(event) => patch({ title: event.target.value })}
              />
            </label>
            <label className="block">
              <span className="field-label">When</span>
              <input
                type="datetime-local"
                className="field-input"
                value={toDatetimeLocal(session.scheduledAt)}
                onChange={(event) => {
                  if (!event.target.value) return;
                  patch({ scheduledAt: new Date(event.target.value).toISOString() });
                }}
              />
            </label>
            <label className="block">
              <span className="field-label">Where</span>
              <input
                className="field-input"
                placeholder="Back office, Zoom, area meeting…"
                value={session.location}
                onChange={(event) => patch({ location: event.target.value })}
              />
            </label>
            <fieldset>
              <legend className="field-label">Status</legend>
              <div className="flex flex-wrap gap-2">
                {L10_STATUSES.map((status) => (
                  <StatusButton
                    key={status}
                    status={status}
                    active={session.status === status}
                    onClick={() => patch({ status })}
                  />
                ))}
              </div>
            </fieldset>
          </div>
        </section>

        <section className="glass-panel p-5">
          <h2 className="section-title">Prep notes</h2>
          <p className="mb-3 mt-1 text-sm text-slate-500">
            Talking points, reminders, and anything you don&apos;t want to forget.
          </p>
          <textarea
            className="field-input min-h-[160px]"
            placeholder="Numbers to call out, people to shout out, questions you want to ask…"
            value={session.notes}
            onChange={(event) => patch({ notes: event.target.value })}
          />
        </section>
      </div>

      <div className="lg:col-span-2">
        <ScorecardStrip compact />
      </div>
    </div>
  );
}

function StatusButton({
  status,
  active,
  onClick,
}: {
  status: L10Status;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-3 py-2 text-xs font-semibold ${
        active ? "bg-cfa text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      {STATUS_LABEL[status]}
    </button>
  );
}

function MeetingTab({
  session,
  patch,
}: {
  session: L10Session;
  patch: (draft: Partial<L10Session>) => void;
}) {
  const [sectionId, setSectionId] = useState(session.agenda[0]?.id ?? "segue");
  const section = session.agenda.find((item) => item.id === sectionId) ?? session.agenda[0];
  const meta = L10_AGENDA.find((item) => item.id === section?.id);

  const updateAgenda = (id: string, draft: Partial<L10Session["agenda"][number]>) => {
    patch({
      agenda: session.agenda.map((item) => (item.id === id ? { ...item, ...draft } : item)),
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
      <nav className="glass-panel h-fit p-2">
        {session.agenda.map((item) => {
          const info = L10_AGENDA.find((row) => row.id === item.id);
          const active = item.id === sectionId;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSectionId(item.id)}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold ${
                active ? "bg-cfa text-white" : "text-slate-600 hover:bg-rose-50"
              }`}
            >
              <span className="flex items-center gap-2">
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-md ${
                    item.done ? (active ? "bg-white/20" : "bg-emerald-100 text-emerald-700") : active ? "bg-white/15" : "bg-slate-100"
                  }`}
                >
                  {item.done ? <Check className="h-3 w-3" /> : null}
                </span>
                {item.title}
              </span>
              <span className={`text-[10px] ${active ? "text-white/70" : "text-slate-400"}`}>
                {info?.minutes ?? item.minutes}m
              </span>
            </button>
          );
        })}
      </nav>

      <div className="space-y-6">
        {section && (
          <section className="glass-panel p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                  {meta?.minutes ?? section.minutes} minutes
                </p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">{section.title}</h2>
                <p className="mt-1 text-sm text-slate-500">{meta?.blurb}</p>
              </div>
              <button
                type="button"
                onClick={() => updateAgenda(section.id, { done: !section.done })}
                className={section.done ? "btn-secondary py-2" : "btn-primary bg-cfa py-2 hover:bg-cfa-dark"}
              >
                <Check className="h-4 w-4" />
                {section.done ? "Completed" : "Mark complete"}
              </button>
            </div>
            <textarea
              className="field-input mt-4 min-h-[100px]"
              placeholder="Notes for this section…"
              value={section.notes}
              onChange={(event) => updateAgenda(section.id, { notes: event.target.value })}
            />
          </section>
        )}

        {sectionId === "scorecard" && (
          <section className="space-y-4">
            <ScorecardStrip compact />
            <label className="glass-panel block p-5">
              <span className="field-label">Dropped balls / numbers to raise</span>
              <textarea
                className="field-input min-h-[90px]"
                placeholder="Anything off track goes to the issues list."
                value={session.scorecardNotes}
                onChange={(event) => patch({ scorecardNotes: event.target.value })}
              />
            </label>
          </section>
        )}

        {sectionId === "segue" && (
          <label className="glass-panel block p-5">
            <span className="field-label">Good news</span>
            <textarea
              className="field-input min-h-[90px]"
              placeholder="Personal and business wins around the table…"
              value={session.segueNotes}
              onChange={(event) => patch({ segueNotes: event.target.value })}
            />
          </label>
        )}

        {sectionId === "rocks" && (
          <RocksPanel
            rocks={session.rocks}
            onChange={(rocks) => patch({ rocks })}
            onRaiseIssue={(rock) =>
              patch({
                issues: [
                  {
                    id: generateId(),
                    title: `Off-track rock: ${rock.title}`,
                    detail: rock.notes,
                    owner: rock.owner,
                    rank: null,
                    solved: false,
                    solution: "",
                  },
                  ...session.issues,
                ],
              })
            }
          />
        )}

        {sectionId === "headlines" && (
          <HeadlinesPanel
            headlines={session.headlines}
            onChange={(headlines) => patch({ headlines })}
            onRaiseIssue={(headline) =>
              patch({
                issues: [
                  {
                    id: generateId(),
                    title: headline.text,
                    detail: `${headline.kind} headline`,
                    owner: "",
                    rank: null,
                    solved: false,
                    solution: "",
                  },
                  ...session.issues,
                ],
              })
            }
          />
        )}

        {sectionId === "todos" && (
          <TodosPanel todos={session.todos} onChange={(todos) => patch({ todos })} />
        )}

        {sectionId === "ids" && (
          <IssuesPanel issues={session.issues} onChange={(issues) => patch({ issues })} />
        )}

        {sectionId === "conclude" && <ConcludePanel session={session} patch={patch} />}
      </div>
    </div>
  );
}

function FollowupTab({
  session,
  patch,
}: {
  session: L10Session;
  patch: (draft: Partial<L10Session>) => void;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ConcludePanel session={session} patch={patch} />
      <TodosPanel todos={session.todos} onChange={(todos) => patch({ todos })} />
      <div className="lg:col-span-2">
        <IssuesPanel issues={session.issues} onChange={(issues) => patch({ issues })} />
      </div>
    </div>
  );
}

function ConcludePanel({
  session,
  patch,
}: {
  session: L10Session;
  patch: (draft: Partial<L10Session>) => void;
}) {
  return (
    <section className="glass-panel p-5">
      <h2 className="section-title">Conclude</h2>
      <p className="mt-1 text-sm text-slate-500">Recap to-dos, cascade messages, rate the meeting.</p>
      <div className="mt-4">
        <p className="field-label">Meeting rating</p>
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: 10 }, (_, index) => index + 1).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => patch({ rating: n, status: n ? "done" : session.status })}
              className={`h-9 w-9 rounded-xl text-sm font-bold ${
                session.rating === n ? "bg-cfa text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      <label className="mt-4 block">
        <span className="field-label">Cascade messages</span>
        <textarea
          className="field-input min-h-[90px]"
          placeholder="What needs to be told to the rest of the team?"
          value={session.cascade}
          onChange={(event) => patch({ cascade: event.target.value })}
        />
      </label>
    </section>
  );
}

function RocksPanel({
  rocks,
  onChange,
  onRaiseIssue,
}: {
  rocks: Rock[];
  onChange: (rocks: Rock[]) => void;
  onRaiseIssue: (rock: Rock) => void;
}) {
  const add = () => {
    onChange([
      ...rocks,
      { id: generateId(), title: "", owner: "", status: "on_track", notes: "" },
    ]);
  };

  return (
    <section className="glass-panel p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="section-title">Quarterly rocks</h2>
        <button type="button" className="btn-secondary py-2 text-sm" onClick={add}>
          <Plus className="h-4 w-4" />
          Add rock
        </button>
      </div>
      {rocks.length === 0 ? (
        <p className="text-sm text-slate-500">
          Add the 3–7 most important things this quarter. On/off track only — no long updates.
        </p>
      ) : (
        <ul className="space-y-3">
          {rocks.map((rock) => (
            <li key={rock.id} className="rounded-xl border border-slate-200 p-3">
              <input
                className="w-full bg-transparent text-sm font-semibold text-slate-900 outline-none"
                placeholder="Rock title"
                value={rock.title}
                onChange={(event) =>
                  onChange(rocks.map((item) => (item.id === rock.id ? { ...item, title: event.target.value } : item)))
                }
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input
                  className="field-input max-w-[160px] py-1.5"
                  placeholder="Owner"
                  value={rock.owner}
                  onChange={(event) =>
                    onChange(
                      rocks.map((item) => (item.id === rock.id ? { ...item, owner: event.target.value } : item))
                    )
                  }
                />
                {(["on_track", "off_track", "done"] as RockStatus[]).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() =>
                      onChange(
                        rocks.map((item) => (item.id === rock.id ? { ...item, status } : item))
                      )
                    }
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase ${
                      rock.status === status
                        ? status === "off_track"
                          ? "bg-rose-600 text-white"
                          : status === "done"
                            ? "bg-emerald-600 text-white"
                            : "bg-sky-600 text-white"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {status.replace("_", " ")}
                  </button>
                ))}
                {rock.status === "off_track" && (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-cfa"
                    onClick={() => onRaiseIssue(rock)}
                  >
                    Send to IDS <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  className="ml-auto text-slate-400 hover:text-rose-600"
                  onClick={() => onChange(rocks.filter((item) => item.id !== rock.id))}
                  aria-label="Remove rock"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function HeadlinesPanel({
  headlines,
  onChange,
  onRaiseIssue,
}: {
  headlines: Headline[];
  onChange: (headlines: Headline[]) => void;
  onRaiseIssue: (headline: Headline) => void;
}) {
  const add = (kind: HeadlineKind) => {
    onChange([...headlines, { id: generateId(), kind, text: "", raiseAsIssue: false }]);
  };

  return (
    <section className="glass-panel p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="section-title">Headlines</h2>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary py-2 text-sm" onClick={() => add("customer")}>
            Customer
          </button>
          <button type="button" className="btn-secondary py-2 text-sm" onClick={() => add("employee")}>
            Employee
          </button>
        </div>
      </div>
      {headlines.length === 0 ? (
        <p className="text-sm text-slate-500">Drop one-line customer or employee news. Raise anything that needs IDS.</p>
      ) : (
        <ul className="space-y-3">
          {headlines.map((headline) => (
            <li key={headline.id} className="flex flex-col gap-2 rounded-xl border border-slate-200 p-3">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                  {headline.kind}
                </span>
                <button
                  type="button"
                  className="ml-auto text-slate-400 hover:text-rose-600"
                  onClick={() => onChange(headlines.filter((item) => item.id !== headline.id))}
                  aria-label="Remove headline"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <input
                className="bg-transparent text-sm font-medium text-slate-900 outline-none"
                placeholder="What happened?"
                value={headline.text}
                onChange={(event) =>
                  onChange(
                    headlines.map((item) =>
                      item.id === headline.id ? { ...item, text: event.target.value } : item
                    )
                  )
                }
              />
              <button
                type="button"
                className="inline-flex items-center gap-1 self-start text-xs font-semibold text-cfa"
                onClick={() => onRaiseIssue(headline)}
              >
                Send to IDS <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function TodosPanel({
  todos,
  onChange,
}: {
  todos: TodoItem[];
  onChange: (todos: TodoItem[]) => void;
}) {
  const add = () => {
    onChange([
      ...todos,
      { id: generateId(), title: "", owner: "", dueDate: "", status: "open" },
    ]);
  };

  return (
    <section className="glass-panel p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="section-title">To-dos</h2>
        <button type="button" className="btn-secondary py-2 text-sm" onClick={add}>
          <Plus className="h-4 w-4" />
          Add to-do
        </button>
      </div>
      {todos.length === 0 ? (
        <p className="text-sm text-slate-500">Seven-day to-dos only. Done or not done — no updates.</p>
      ) : (
        <ul className="space-y-2">
          {todos.map((todo) => (
            <li key={todo.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
              <button
                type="button"
                onClick={() =>
                  onChange(
                    todos.map((item) =>
                      item.id === todo.id
                        ? { ...item, status: (item.status === "done" ? "open" : "done") as TodoStatus }
                        : item
                    )
                  )
                }
                className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                  todo.status === "done" ? "bg-emerald-600 text-white" : "border border-slate-300"
                }`}
                aria-label={todo.status === "done" ? "Mark open" : "Mark done"}
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <input
                className={`min-w-[140px] flex-1 bg-transparent text-sm outline-none ${
                  todo.status === "done" ? "text-slate-400 line-through" : "font-medium text-slate-900"
                }`}
                placeholder="To-do"
                value={todo.title}
                onChange={(event) =>
                  onChange(todos.map((item) => (item.id === todo.id ? { ...item, title: event.target.value } : item)))
                }
              />
              <input
                className="w-28 rounded-lg border border-slate-200 px-2 py-1 text-xs"
                placeholder="Owner"
                value={todo.owner}
                onChange={(event) =>
                  onChange(todos.map((item) => (item.id === todo.id ? { ...item, owner: event.target.value } : item)))
                }
              />
              <input
                type="date"
                className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
                value={todo.dueDate}
                onChange={(event) =>
                  onChange(
                    todos.map((item) => (item.id === todo.id ? { ...item, dueDate: event.target.value } : item))
                  )
                }
              />
              <button
                type="button"
                className="text-slate-400 hover:text-rose-600"
                onClick={() => onChange(todos.filter((item) => item.id !== todo.id))}
                aria-label="Remove to-do"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function IssuesPanel({
  issues,
  onChange,
}: {
  issues: Issue[];
  onChange: (issues: Issue[]) => void;
}) {
  const add = () => {
    onChange([
      {
        id: generateId(),
        title: "",
        detail: "",
        owner: "",
        rank: null,
        solved: false,
        solution: "",
      },
      ...issues,
    ]);
  };

  const sorted = useMemo(() => {
    return [...issues].sort((a, b) => {
      if (a.solved !== b.solved) return a.solved ? 1 : -1;
      if (a.rank == null && b.rank == null) return 0;
      if (a.rank == null) return 1;
      if (b.rank == null) return -1;
      return a.rank - b.rank;
    });
  }, [issues]);

  const setRank = (id: string, rank: number) => {
    onChange(
      issues.map((issue) => {
        if (issue.id === id) return { ...issue, rank: issue.rank === rank ? null : rank };
        if (issue.rank === rank) return { ...issue, rank: null };
        return issue;
      })
    );
  };

  return (
    <section className="glass-panel p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="section-title">IDS issues</h2>
          <p className="text-sm text-slate-500">Rank the top 3, then Identify, Discuss, Solve in order.</p>
        </div>
        <button type="button" className="btn-secondary py-2 text-sm" onClick={add}>
          <Plus className="h-4 w-4" />
          Add issue
        </button>
      </div>
      {sorted.length === 0 ? (
        <p className="text-sm text-slate-500">Parking lot is empty. Drop issues from scorecard, rocks, and headlines.</p>
      ) : (
        <ul className="space-y-3">
          {sorted.map((issue) => (
            <li
              key={issue.id}
              className={`rounded-xl border p-3 ${
                issue.solved ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200"
              }`}
            >
              <div className="flex flex-wrap items-start gap-2">
                <div className="flex gap-1">
                  {[1, 2, 3].map((rank) => (
                    <button
                      key={rank}
                      type="button"
                      onClick={() => setRank(issue.id, rank)}
                      className={`h-8 w-8 rounded-lg text-xs font-bold ${
                        issue.rank === rank ? "bg-cfa text-white" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {rank}
                    </button>
                  ))}
                </div>
                <div className="min-w-[160px] flex-1">
                  <input
                    className="w-full bg-transparent text-sm font-semibold outline-none"
                    placeholder="Issue title"
                    value={issue.title}
                    onChange={(event) =>
                      onChange(
                        issues.map((item) =>
                          item.id === issue.id ? { ...item, title: event.target.value } : item
                        )
                      )
                    }
                  />
                  <textarea
                    className="mt-1 w-full bg-transparent text-sm text-slate-600 outline-none"
                    rows={2}
                    placeholder="What's the real issue?"
                    value={issue.detail}
                    onChange={(event) =>
                      onChange(
                        issues.map((item) =>
                          item.id === issue.id ? { ...item, detail: event.target.value } : item
                        )
                      )
                    }
                  />
                </div>
                <input
                  className="w-28 rounded-lg border border-slate-200 px-2 py-1 text-xs"
                  placeholder="Owner"
                  value={issue.owner}
                  onChange={(event) =>
                    onChange(
                      issues.map((item) =>
                        item.id === issue.id ? { ...item, owner: event.target.value } : item
                      )
                    )
                  }
                />
                <button
                  type="button"
                  className="text-slate-400 hover:text-rose-600"
                  onClick={() => onChange(issues.filter((item) => item.id !== issue.id))}
                  aria-label="Remove issue"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onChange(
                      issues.map((item) =>
                        item.id === issue.id ? { ...item, solved: !item.solved } : item
                      )
                    )
                  }
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase ${
                    issue.solved ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {issue.solved ? "Solved" : "Mark solved"}
                </button>
                {issue.solved && (
                  <input
                    className="min-w-[180px] flex-1 rounded-lg border border-slate-200 px-2 py-1 text-sm"
                    placeholder="Solution / 7-day to-do"
                    value={issue.solution}
                    onChange={(event) =>
                      onChange(
                        issues.map((item) =>
                          item.id === issue.id ? { ...item, solution: event.target.value } : item
                        )
                      )
                    }
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
