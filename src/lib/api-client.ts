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
  role?: string;
  jobTitle?: string | null;
}

export interface TeamInviteRecord {
  id: string;
  email: string;
  name: string;
  jobTitle: string | null;
  role: string;
  locationName: string;
  token: string;
  inviteUrl: string;
  invitedByName: string;
  expiresAt: string;
  acceptedAt?: string;
  createdAt: string;
  status: "pending" | "accepted" | "expired";
}

export interface CreateTeamMemberResult {
  user: CloudEmployee;
  tempPassword?: string;
  message: string;
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
  const res = await fetch("/api/users?role=EMPLOYEE");
  return parseJson(res);
}

export async function fetchTeamMembers(): Promise<CloudEmployee[]> {
  const res = await fetch("/api/users");
  return parseJson(res);
}

export async function fetchInvites(): Promise<TeamInviteRecord[]> {
  const res = await fetch("/api/invites");
  return parseJson(res);
}

export async function createInvite(input: {
  name: string;
  email: string;
  jobTitle?: string;
  role?: "ADMIN" | "EMPLOYEE";
  locationName?: string;
}): Promise<TeamInviteRecord & { message?: string }> {
  const res = await fetch("/api/invites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseJson(res);
}

export async function cancelInvite(id: string): Promise<void> {
  const res = await fetch(`/api/invites?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Could not cancel invite");
  }
}

export async function createTeamMember(input: {
  name: string;
  email: string;
  jobTitle?: string;
  role?: "ADMIN" | "EMPLOYEE";
  locationName?: string;
  password?: string;
}): Promise<CreateTeamMemberResult> {
  const res = await fetch("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseJson(res);
}

export async function updateTeamMember(
  id: string,
  input: {
    name?: string;
    jobTitle?: string | null;
    role?: "ADMIN" | "EMPLOYEE";
    locationName?: string;
    isActive?: boolean;
    password?: string;
  }
): Promise<CloudEmployee & { isActive?: boolean }> {
  const res = await fetch(`/api/users/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseJson(res);
}

export async function deactivateTeamMember(id: string): Promise<void> {
  const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Could not remove team member");
  }
}

export async function fetchInviteDetails(token: string): Promise<{
  name: string;
  email: string;
  jobTitle: string | null;
  role: string;
  locationName: string;
  invitedByName: string;
  expiresAt: string;
}> {
  const res = await fetch(`/api/invites/${token}`);
  return parseJson(res);
}

export async function acceptInvite(
  token: string,
  password: string,
  confirmPassword: string
): Promise<{ ok: boolean; message: string; email: string }> {
  const res = await fetch(`/api/invites/${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password, confirmPassword }),
  });
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
