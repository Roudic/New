import { checklistTemplates as builtinTemplates } from "./templates";
import type { ChecklistTemplate } from "./types";

export { checklistTemplates as builtinTemplates } from "./templates";

export function getAllTemplates(
  customChecklists: ChecklistTemplate[]
): ChecklistTemplate[] {
  return [...customChecklists, ...builtinTemplates];
}

export function resolveTemplate(
  id: string,
  customChecklists: ChecklistTemplate[]
): ChecklistTemplate | undefined {
  return (
    customChecklists.find((t) => t.id === id) ??
    builtinTemplates.find((t) => t.id === id)
  );
}

export function isCustomChecklist(template: ChecklistTemplate): boolean {
  return template.isCustom === true;
}
