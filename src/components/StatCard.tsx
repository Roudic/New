import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: "blue" | "green" | "amber" | "slate" | "violet";
  hint?: string;
}

const accentStyles = {
  blue: "bg-brand-50 text-brand-600 ring-brand-100",
  green: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  amber: "bg-amber-50 text-amber-600 ring-amber-100",
  slate: "bg-slate-100 text-slate-600 ring-slate-200",
  violet: "bg-violet-50 text-violet-600 ring-violet-100",
};

export function StatCard({
  label,
  value,
  icon: Icon,
  accent = "blue",
  hint,
}: StatCardProps) {
  return (
    <div className="glass-panel p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
          {hint && (
            <p className="mt-1 text-xs font-medium text-slate-500">{hint}</p>
          )}
        </div>
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl ring-1 ${accentStyles[accent]}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
