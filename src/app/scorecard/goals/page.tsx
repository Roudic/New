"use client";

import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useScorecard } from "@/hooks/useScorecard";
import { upsertGoals } from "@/lib/scorecard/merge";
import { DEFAULT_GOALS_2026, type ScorecardGoals } from "@/lib/scorecard/types";

const FIELDS: Array<{ key: keyof ScorecardGoals; label: string; step: string }> = [
  { key: "salesGrowthPct", label: "Sales growth target %", step: "0.1" },
  { key: "laborTargetPct", label: "Labor target %", step: "0.1" },
  { key: "foodCostTargetPct", label: "Food cost target %", step: "0.1" },
  { key: "netProfitTargetPct", label: "Net profit target %", step: "0.1" },
  { key: "osatGoal", label: "OSAT goal", step: "0.1" },
  { key: "foodSafetyGoal", label: "Food safety goal", step: "1" },
  { key: "foodQualityGoal", label: "Food quality goal", step: "1" },
  { key: "dtSosGoalMin", label: "DT SOS goal (minutes)", step: "0.5" },
];

export default function GoalsPage() {
  const { state, persist, saving } = useScorecard();
  const years = state.goals.length ? state.goals : [DEFAULT_GOALS_2026];
  const [year, setYear] = useState(years.at(-1)?.year ?? 2026);
  const current = years.find((g) => g.year === year) ?? { ...DEFAULT_GOALS_2026, year };
  const [draft, setDraft] = useState<ScorecardGoals>(current);
  const [saved, setSaved] = useState(false);

  const switchYear = (nextYear: number) => {
    setYear(nextYear);
    setDraft(years.find((g) => g.year === nextYear) ?? { ...DEFAULT_GOALS_2026, year: nextYear });
    setSaved(false);
  };

  const handleSave = async () => {
    await persist(upsertGoals(state, { ...draft, year }));
    setSaved(true);
  };

  return (
    <>
      <PageHeader
        eyebrow="Goals / Config"
        title="Targets that drive the hub"
        description="These are the Config tab values. Changing a target recalculates labor goal, status chips, and SOS variance across every page."
      />

      <div className="mb-4 flex gap-2">
        {years.map((g) => (
          <button
            key={g.year}
            type="button"
            onClick={() => switchYear(g.year)}
            className={g.year === year ? "btn-primary bg-cfa hover:bg-cfa-dark" : "btn-secondary"}
          >
            {g.year}
          </button>
        ))}
      </div>

      <form
        className="glass-panel grid gap-4 p-6 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSave();
        }}
      >
        {FIELDS.map((field) => (
          <label key={field.key} className="block">
            <span className="field-label">{field.label}</span>
            <input
              className="field-input"
              type="number"
              step={field.step}
              value={draft[field.key] as number}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, [field.key]: Number(e.target.value) }))
              }
            />
          </label>
        ))}
        <div className="sm:col-span-2 flex items-center gap-3">
          <button type="submit" className="btn-primary bg-cfa hover:bg-cfa-dark" disabled={saving}>
            {saving ? "Saving…" : "Save goals"}
          </button>
          {saved && <p className="text-sm font-medium text-emerald-700">Goals updated.</p>}
        </div>
      </form>
    </>
  );
}
