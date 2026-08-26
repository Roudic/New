import { generateId } from "@/lib/utils";
import { DEFAULT_BRING_LABELS, L10_AGENDA } from "./defaults";
import type {
  AgendaSection,
  BringItem,
  Issue,
  L10Payload,
  L10Session,
  L10SessionDraft,
  L10Status,
  Rock,
  TodoItem,
} from "./types";
import { L10_STATUSES } from "./types";

export function defaultBringItems(): BringItem[] {
  return DEFAULT_BRING_LABELS.map((label) => ({
    id: generateId(),
    label,
    packed: false,
  }));
}

export function defaultAgenda(): AgendaSection[] {
  return L10_AGENDA.map((section) => ({
    id: section.id,
    title: section.title,
    minutes: section.minutes,
    notes: "",
    done: false,
  }));
}

export function sessionTitle(date: Date): string {
  const label = date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `L10 · ${label}`;
}

export function defaultMeetingTime(from = new Date()): Date {
  const scheduled = new Date(from);
  scheduled.setHours(8, 0, 0, 0);
  return scheduled;
}

function cloneOpenTodos(previous: L10Session): TodoItem[] {
  return previous.todos
    .filter((todo) => todo.status === "open")
    .map((todo) => ({
      ...todo,
      id: generateId(),
      fromSessionId: previous.id,
    }));
}

function cloneOpenIssues(previous: L10Session): Issue[] {
  return previous.issues
    .filter((issue) => !issue.solved)
    .map((issue) => ({
      ...issue,
      id: generateId(),
      rank: null,
    }));
}

function cloneRocks(previous: L10Session): Rock[] {
  return previous.rocks
    .filter((rock) => rock.status !== "done")
    .map((rock) => ({
      ...rock,
      id: generateId(),
    }));
}

export function createL10Session(input?: {
  id?: string;
  title?: string;
  scheduledAt?: string;
  location?: string;
  previous?: L10Session | null;
}): L10Session {
  const now = new Date();
  const scheduled = input?.scheduledAt
    ? new Date(input.scheduledAt)
    : defaultMeetingTime(now);
  const previous = input?.previous ?? null;
  const createdAt = now.toISOString();

  return {
    id: input?.id ?? generateId(),
    title: input?.title?.trim() || sessionTitle(scheduled),
    scheduledAt: scheduled.toISOString(),
    location: input?.location ?? previous?.location ?? "",
    status: "prep",
    rating: null,
    cascade: "",
    notes: "",
    segueNotes: "",
    scorecardNotes: "",
    bringItems: defaultBringItems(),
    agenda: defaultAgenda(),
    rocks: previous ? cloneRocks(previous) : [],
    headlines: [],
    todos: previous ? cloneOpenTodos(previous) : [],
    issues: previous ? cloneOpenIssues(previous) : [],
    createdAt,
    updatedAt: createdAt,
  };
}

export function toPayload(session: Pick<L10Session, keyof L10Payload>): L10Payload {
  return {
    cascade: session.cascade,
    notes: session.notes,
    segueNotes: session.segueNotes,
    scorecardNotes: session.scorecardNotes,
    bringItems: session.bringItems,
    agenda: session.agenda,
    rocks: session.rocks,
    headlines: session.headlines,
    todos: session.todos,
    issues: session.issues,
  };
}

export function emptyPayload(): L10Payload {
  return {
    cascade: "",
    notes: "",
    segueNotes: "",
    scorecardNotes: "",
    bringItems: defaultBringItems(),
    agenda: defaultAgenda(),
    rocks: [],
    headlines: [],
    todos: [],
    issues: [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function asNumber(value: unknown, fallback: number | null = null): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function parseBringItems(raw: unknown): BringItem[] {
  if (!Array.isArray(raw)) return defaultBringItems();
  const items = raw.flatMap((item) => {
    if (!isRecord(item) || typeof item.label !== "string") return [];
    return [
      {
        id: asString(item.id, generateId()),
        label: item.label,
        packed: asBoolean(item.packed),
      },
    ];
  });
  return items.length > 0 ? items : defaultBringItems();
}

function parseAgenda(raw: unknown): AgendaSection[] {
  if (!Array.isArray(raw) || raw.length === 0) return defaultAgenda();
  return raw.flatMap((item) => {
    if (!isRecord(item) || typeof item.title !== "string") return [];
    return [
      {
        id: asString(item.id, generateId()),
        title: item.title,
        minutes: asNumber(item.minutes, 5) ?? 5,
        notes: asString(item.notes),
        done: asBoolean(item.done),
      },
    ];
  });
}

export function parsePayload(raw: string | null | undefined): L10Payload {
  const fallback = emptyPayload();
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) return fallback;
    return {
      cascade: asString(parsed.cascade),
      notes: asString(parsed.notes),
      segueNotes: asString(parsed.segueNotes),
      scorecardNotes: asString(parsed.scorecardNotes),
      bringItems: parseBringItems(parsed.bringItems),
      agenda: parseAgenda(parsed.agenda),
      rocks: Array.isArray(parsed.rocks)
        ? parsed.rocks.flatMap((item) => {
            if (!isRecord(item) || typeof item.title !== "string") return [];
            const status =
              item.status === "off_track" || item.status === "done" ? item.status : "on_track";
            return [
              {
                id: asString(item.id, generateId()),
                title: item.title,
                owner: asString(item.owner),
                status,
                notes: asString(item.notes),
              },
            ];
          })
        : [],
      headlines: Array.isArray(parsed.headlines)
        ? parsed.headlines.flatMap((item) => {
            if (!isRecord(item) || typeof item.text !== "string") return [];
            const kind =
              item.kind === "employee" || item.kind === "other" ? item.kind : "customer";
            return [
              {
                id: asString(item.id, generateId()),
                kind,
                text: item.text,
                raiseAsIssue: asBoolean(item.raiseAsIssue),
              },
            ];
          })
        : [],
      todos: Array.isArray(parsed.todos)
        ? parsed.todos.flatMap((item) => {
            if (!isRecord(item) || typeof item.title !== "string") return [];
            const status =
              item.status === "done" || item.status === "dropped" ? item.status : "open";
            return [
              {
                id: asString(item.id, generateId()),
                title: item.title,
                owner: asString(item.owner),
                dueDate: asString(item.dueDate),
                status,
                fromSessionId:
                  typeof item.fromSessionId === "string" ? item.fromSessionId : undefined,
              },
            ];
          })
        : [],
      issues: Array.isArray(parsed.issues)
        ? parsed.issues.flatMap((item) => {
            if (!isRecord(item) || typeof item.title !== "string") return [];
            return [
              {
                id: asString(item.id, generateId()),
                title: item.title,
                detail: asString(item.detail),
                owner: asString(item.owner),
                rank: asNumber(item.rank),
                solved: asBoolean(item.solved),
                solution: asString(item.solution),
              },
            ];
          })
        : [],
    };
  } catch {
    return fallback;
  }
}

export function applyDraft(session: L10Session, draft: L10SessionDraft): L10Session {
  return {
    ...session,
    ...draft,
    updatedAt: new Date().toISOString(),
  };
}

export function isL10Status(value: unknown): value is L10Status {
  return typeof value === "string" && (L10_STATUSES as readonly string[]).includes(value);
}

export function prepProgress(session: L10Session): {
  packed: number;
  total: number;
  percent: number;
} {
  const total = session.bringItems.length;
  const packed = session.bringItems.filter((item) => item.packed).length;
  return { packed, total, percent: total === 0 ? 0 : Math.round((packed / total) * 100) };
}

export function meetingProgress(session: L10Session): {
  done: number;
  total: number;
  percent: number;
} {
  const total = session.agenda.length;
  const done = session.agenda.filter((section) => section.done).length;
  return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
}

export function openTodoCount(session: L10Session): number {
  return session.todos.filter((todo) => todo.status === "open").length;
}

export function openIssueCount(session: L10Session): number {
  return session.issues.filter((issue) => !issue.solved).length;
}

export function nextSession(sessions: L10Session[]): L10Session | null {
  const open = sessions
    .filter((session) => session.status !== "done")
    .sort(
      (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    );
  return open[0] ?? null;
}

export function mostRecentPrevious(
  sessions: L10Session[],
  exceptId?: string
): L10Session | null {
  return (
    sessions
      .filter((session) => session.id !== exceptId)
      .sort(
        (a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
      )[0] ?? null
  );
}
