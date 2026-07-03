import type { AssignmentStatus } from "@/lib/types";
import { assignmentStatusLabel } from "@/lib/assignments";

export function AssignmentStatusBadge({
  status,
  overdue,
}: {
  status: AssignmentStatus;
  overdue?: boolean;
}) {
  const base =
    status === "pending"
      ? "bg-amber-50 text-amber-700 ring-amber-200"
      : status === "in_progress"
        ? "bg-sky-50 text-sky-700 ring-sky-200"
        : "bg-emerald-50 text-emerald-700 ring-emerald-200";

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 ${base}`}>
      {overdue && status !== "completed" ? "Overdue" : assignmentStatusLabel(status)}
    </span>
  );
}
