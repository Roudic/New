export type TaskType =
  | "checkbox"
  | "yes_no"
  | "temperature"
  | "text"
  | "photo"
  | "number";

export type ChecklistCategory =
  | "opening"
  | "closing"
  | "food_safety"
  | "cleaning"
  | "shift"
  | "audit"
  | "custom";

export type ChecklistSchedule = "daily" | "weekly" | "per_shift";

export interface ChecklistItem {
  id: string;
  title: string;
  description?: string;
  type: TaskType;
  required: boolean;
  minTemp?: number;
  maxTemp?: number;
  trainingNote?: string;
}

export interface ChecklistTemplate {
  id: string;
  name: string;
  description: string;
  category: ChecklistCategory;
  schedule: ChecklistSchedule;
  estimatedMinutes: number;
  items: ChecklistItem[];
  isCustom?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface TaskCompletion {
  itemId: string;
  completedAt: string;
  completedBy: string;
  value?: string | boolean | number;
  photoDataUrl?: string;
  notes?: string;
}

export type RunStatus = "in_progress" | "completed";

export interface ChecklistRun {
  id: string;
  templateId: string;
  templateName: string;
  category: ChecklistCategory;
  schedule: ChecklistSchedule;
  assignmentId?: string;
  startedAt: string;
  completedAt?: string;
  startedBy: string;
  completions: TaskCompletion[];
  status: RunStatus;
}

export interface AppSettings {
  employeeName: string;
  locationName: string;
  email?: string;
  role?: "ADMIN" | "EMPLOYEE";
}

export type AssignmentStatus = "pending" | "in_progress" | "completed";

export interface Assignment {
  id: string;
  templateId: string;
  templateName?: string;
  templateCategory?: string;
  assignedToEmail: string;
  assignedToName: string;
  assignedToLocation?: string;
  assignedByName: string;
  dueDate?: string;
  status: AssignmentStatus;
  notes?: string;
  createdAt: string;
  activeRunId?: string;
}

export interface AppState {
  settings: AppSettings;
  runs: ChecklistRun[];
  customChecklists: ChecklistTemplate[];
  assignments: Assignment[];
}

export type ChecklistDraft = Omit<
  ChecklistTemplate,
  "id" | "isCustom" | "createdAt" | "updatedAt"
>;
