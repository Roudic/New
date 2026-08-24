import type { KpiResult } from "@/lib/scorecard/types";
import { formatKpi, formatSignedMoney, formatSignedPercent } from "@/lib/scorecard/format";
import { StatusChip } from "./ScorecardChrome";

export function KpiTile({ kpi }: { kpi: KpiResult }) {
  const varianceLabel =
    kpi.variance == null
      ? "vs goal: —"
      : kpi.unit === "money"
        ? `vs goal: ${formatSignedMoney(kpi.variance)}`
        : kpi.unit === "percent" || kpi.unit === "score"
          ? `vs goal: ${formatSignedPercent(kpi.variance)}`
          : `vs goal: ${formatKpi(kpi.goal, kpi.unit)}`;

  return (
    <article className="glass-panel overflow-hidden border-t-4 border-t-cfa p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
          {kpi.label}
        </p>
        <StatusChip status={kpi.status} />
      </div>
      <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
        {formatKpi(kpi.value, kpi.unit)}
      </p>
      <p className="mt-2 text-xs font-medium text-slate-500">{varianceLabel}</p>
    </article>
  );
}
