import type {
  Assignment,
  ChecklistDraft,
  ChecklistRun,
  ChecklistTemplate,
} from "@/lib/types";

export interface HealthResponse {
  ok: boolean;
  needsSeed?: boolean;
  users?: number;
  error?: string;
}

export interface CloudEmployee {
  id: string;
  name: string;
  email: string;
  locationName: string;
}

interface ApiAssignment {
  id: string;
  templateId: string;
  templateName?: string;
  templateCategory?: string;
  template?: { name: string; category: string };
  assignedTo: { id: string; name: string; email: string; locationName: string };
  assignedBy: { id: string; name: string };
  dueDate?: string | null;
  status: string;
  notes?: string | null;
  createdAt: string;
  activeRunId?: string;
}

export async function fetchHealth(): Promise<HealthResponse> {
  try {
    const res = await fetch("/api/health");
    return (await res.json()) as HealthResponse;
  } catch {
    return { ok: false, error: "Could not reach the server." };
  }
}

export function normalizeAssignment(raw: ApiAssignment): Assignment {
  return {
    id: raw.id,
    templateId: raw.templateId,
    templateName: raw.templateName ?? raw.template?.name,
    templateCategory: raw.templateCategory ?? raw.template?.category,
    assignedToEmail: raw.assignedTo.email,
    assignedToName: raw.assignedTo.name,
    assignedToLocation: raw.assignedTo.locationName,
    assignedByName: raw.assignedBy.name,
    dueDate: raw.dueDate ?? undefined,
    status: raw.status as Assignment["status"],
    notes: raw.notes ?? undefined,
    createdAt: raw.createdAt,
    activeRunId: raw.activeRunId,
  };
}

async function parseJson<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      typeof data.error === "string" ? data.error : "Request failed"
    );
  }
  return data as T;
}

export async function fetchTemplates(): Promise<ChecklistTemplate[]> {
  const res = await fetch("/api/checklists");
  return parseJson(res);
}

export async function fetchAssignments(): Promise<Assignment[]> {
  const res = await fetch("/api/assignments");
  const data = await parseJson<ApiAssignment[]>(res);
  return data.map(normalizeAssignment);
}

export async function fetchRuns(): Promise<ChecklistRun[]> {
  const res = await fetch("/api/runs");
  return parseJson(res);
}

export async function fetchEmployees(): Promise<CloudEmployee[]> {
  const res = await fetch("/api/users");
  return parseJson(res);
}

export async function createCloudChecklist(
  draft: ChecklistDraft
): Promise<ChecklistTemplate> {
  const res = await fetch("/api/checklists", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(draft),
  });
  return parseJson(res);
}

export async function updateCloudChecklist(
  id: string,
  draft: ChecklistDraft
): Promise<ChecklistTemplate> {
  const res = await fetch(`/api/checklists/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(draft),
  });
  return parseJson(res);
}

export async function deleteCloudChecklist(id: string): Promise<void> {
  const res = await fetch(`/api/checklists/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Delete failed");
  }
}

export async function createCloudAssignment(input: {
  templateId: string;
  assignedToId: string;
  dueDate?: string;
  notes?: string;
}): Promise<Assignment> {
  const res = await fetch("/api/assignments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await parseJson<ApiAssignment>(res);
  return normalizeAssignment(data);
}

export async function startCloudRun(input: {
  templateId?: string;
  assignmentId?: string;
}): Promise<ChecklistRun> {
  const res = await fetch("/api/runs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseJson(res);
}
