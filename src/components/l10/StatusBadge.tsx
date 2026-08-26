import { STATUS_LABEL } from "@/lib/l10/defaults";
import type { L10Status } from "@/lib/l10/types";

const STYLES: Record<L10Status, string> = {
  prep: "bg-amber-50 text-amber-800 ring-amber-100",
  ready: "bg-sky-50 text-sky-800 ring-sky-100",
  in_meeting: "bg-violet-50 text-violet-800 ring-violet-100",
  done: "bg-emerald-50 text-emerald-800 ring-emerald-100",
};

export function StatusBadge({ status }: { status: L10Status }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${STYLES[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
