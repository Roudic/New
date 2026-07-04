import type { Assignment, AssignmentStatus } from "./types";

export function assignmentStatusLabel(status: AssignmentStatus): string {
  const labels: Record<AssignmentStatus, string> = {
    pending: "Pending",
    in_progress: "In Progress",
    completed: "Completed",
  };
  return labels[status];
}

export function assignmentStatusColor(status: AssignmentStatus): string {
  const colors: Record<AssignmentStatus, string> = {
    pending: "bg-amber-50 text-amber-700 ring-amber-200",
    in_progress: "bg-sky-50 text-sky-700 ring-sky-200",
    completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  };
  return colors[status];
}

export function isAssignmentOverdue(assignment: Assignment): boolean {
  if (!assignment.dueDate || assignment.status === "completed") return false;
  const due = new Date(assignment.dueDate);
  due.setHours(23, 59, 59, 999);
  return due.getTime() < Date.now();
}

export function sortAssignmentsByUrgency(assignments: Assignment[]): Assignment[] {
  return [...assignments].sort((a, b) => {
    const aOverdue = isAssignmentOverdue(a) ? 0 : 1;
    const bOverdue = isAssignmentOverdue(b) ? 0 : 1;
    if (aOverdue !== bOverdue) return aOverdue - bOverdue;

    const statusOrder: Record<AssignmentStatus, number> = {
      in_progress: 0,
      pending: 1,
      completed: 2,
    };
    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[a.status] - statusOrder[b.status];
    }

    const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
    const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
    return aDue - bDue;
  });
}
