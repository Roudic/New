export const L10_STATUSES = ["prep", "ready", "in_meeting", "done"] as const;
export type L10Status = (typeof L10_STATUSES)[number];

export const ROCK_STATUSES = ["on_track", "off_track", "done"] as const;
export type RockStatus = (typeof ROCK_STATUSES)[number];

export const TODO_STATUSES = ["open", "done", "dropped"] as const;
export type TodoStatus = (typeof TODO_STATUSES)[number];

export const HEADLINE_KINDS = ["customer", "employee", "other"] as const;
export type HeadlineKind = (typeof HEADLINE_KINDS)[number];

export interface BringItem {
  id: string;
  label: string;
  packed: boolean;
}

export interface AgendaSection {
  id: string;
  title: string;
  minutes: number;
  notes: string;
  done: boolean;
}

export interface Rock {
  id: string;
  title: string;
  owner: string;
  status: RockStatus;
  notes: string;
}

export interface Headline {
  id: string;
  kind: HeadlineKind;
  text: string;
  raiseAsIssue: boolean;
}

export interface TodoItem {
  id: string;
  title: string;
  owner: string;
  dueDate: string;
  status: TodoStatus;
  fromSessionId?: string;
}

export interface Issue {
  id: string;
  title: string;
  detail: string;
  owner: string;
  rank: number | null;
  solved: boolean;
  solution: string;
}

export interface L10Session {
  id: string;
  title: string;
  scheduledAt: string;
  location: string;
  status: L10Status;
  rating: number | null;
  cascade: string;
  notes: string;
  segueNotes: string;
  scorecardNotes: string;
  bringItems: BringItem[];
  agenda: AgendaSection[];
  rocks: Rock[];
  headlines: Headline[];
  todos: TodoItem[];
  issues: Issue[];
  createdAt: string;
  updatedAt: string;
}

export interface L10SessionDraft {
  title?: string;
  scheduledAt?: string;
  location?: string;
  status?: L10Status;
  rating?: number | null;
  cascade?: string;
  notes?: string;
  segueNotes?: string;
  scorecardNotes?: string;
  bringItems?: BringItem[];
  agenda?: AgendaSection[];
  rocks?: Rock[];
  headlines?: Headline[];
  todos?: TodoItem[];
  issues?: Issue[];
}

export interface L10Payload {
  cascade: string;
  notes: string;
  segueNotes: string;
  scorecardNotes: string;
  bringItems: BringItem[];
  agenda: AgendaSection[];
  rocks: Rock[];
  headlines: Headline[];
  todos: TodoItem[];
  issues: Issue[];
}

export interface CreateL10Input {
  title?: string;
  scheduledAt?: string;
  location?: string;
  copyFromPrevious?: boolean;
  session?: L10Session;
}
