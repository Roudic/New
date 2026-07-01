import type { ChecklistRun, ChecklistTemplate, TaskCompletion } from "./types";

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  return `${formatDate(iso)} at ${formatTime(iso)}`;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function getCompletionForItem(
  run: ChecklistRun,
  itemId: string
): TaskCompletion | undefined {
  return run.completions.find((c) => c.itemId === itemId);
}

export function getRunProgress(
  template: ChecklistTemplate,
  run: ChecklistRun
): { completed: number; total: number; percent: number } {
  const requiredItems = template.items.filter((i) => i.required);
  const total = requiredItems.length || template.items.length;
  const targetIds = new Set(
    (requiredItems.length ? requiredItems : template.items).map((i) => i.id)
  );
  const completed = run.completions.filter((c) => targetIds.has(c.itemId)).length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  return { completed, total, percent };
}

export function isRunComplete(
  template: ChecklistTemplate,
  run: ChecklistRun
): boolean {
  const { completed, total } = getRunProgress(template, run);
  return completed >= total;
}

export function categoryLabel(category: string): string {
  const labels: Record<string, string> = {
    opening: "Opening",
    closing: "Closing",
    food_safety: "Food Safety",
    cleaning: "Cleaning",
    shift: "Shift Change",
    audit: "Audit",
  };
  return labels[category] ?? category;
}

export function scheduleLabel(schedule: string): string {
  const labels: Record<string, string> = {
    daily: "Daily",
    weekly: "Weekly",
    per_shift: "Per Shift",
  };
  return labels[schedule] ?? schedule;
}

export function taskTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    checkbox: "Check",
    yes_no: "Yes / No",
    temperature: "Temperature",
    text: "Notes",
    photo: "Photo Proof",
    number: "Number",
  };
  return labels[type] ?? type;
}
