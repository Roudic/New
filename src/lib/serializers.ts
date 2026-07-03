import type {
  ChecklistItem,
  ChecklistTemplate,
  ChecklistRun,
  TaskCompletion,
} from "@prisma/client";

type TemplateWithItems = ChecklistTemplate & { items: ChecklistItem[] };
type RunWithCompletions = ChecklistRun & {
  completions: TaskCompletion[];
  template?: TemplateWithItems;
  user?: { id: string; name: string };
};

export function serializeTemplate(template: TemplateWithItems) {
  return {
    id: template.id,
    name: template.name,
    description: template.description,
    category: template.category,
    schedule: template.schedule,
    estimatedMinutes: template.estimatedMinutes,
    isCustom: !template.isBuiltIn,
    isBuiltIn: template.isBuiltIn,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
    items: template.items
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description ?? undefined,
        type: item.type,
        required: item.required,
        minTemp: item.minTemp ?? undefined,
        maxTemp: item.maxTemp ?? undefined,
        trainingNote: item.trainingNote ?? undefined,
      })),
  };
}

export function serializeRun(run: RunWithCompletions) {
  return {
    id: run.id,
    templateId: run.templateId,
    templateName: run.template?.name ?? "Checklist",
    category: run.template?.category ?? "custom",
    schedule: run.template?.schedule ?? "daily",
    assignmentId: run.assignmentId,
    startedAt: run.startedAt.toISOString(),
    completedAt: run.completedAt?.toISOString(),
    startedBy: run.user?.name ?? run.userId,
    status: run.status === "COMPLETED" ? "completed" : "in_progress",
    completions: run.completions.map((c) => ({
      itemId: c.itemId,
      completedAt: c.completedAt.toISOString(),
      completedBy: c.completedById,
      value:
        c.value === "true"
          ? true
          : c.value === "false"
            ? false
            : c.value !== null && c.value !== "" && !Number.isNaN(Number(c.value))
              ? Number(c.value)
              : c.value ?? undefined,
      photoDataUrl: c.photoDataUrl ?? undefined,
      notes: c.notes ?? undefined,
    })),
    template: run.template ? serializeTemplate(run.template) : undefined,
  };
}

export function serializeAssignment(
  assignment: {
    id: string;
    templateId: string;
    assignedToId: string;
    assignedById: string;
    dueDate: Date | null;
    status: string;
    notes: string | null;
    createdAt: Date;
    template: TemplateWithItems;
    assignedTo: { id: string; name: string; email: string; locationName: string };
    assignedBy: { id: string; name: string };
    runs: ChecklistRun[];
  }
) {
  const activeRun = assignment.runs.find((r) => r.status === "IN_PROGRESS");
  return {
    id: assignment.id,
    templateId: assignment.templateId,
    templateName: assignment.template.name,
    templateCategory: assignment.template.category,
    template: serializeTemplate(assignment.template),
    assignedTo: assignment.assignedTo,
    assignedBy: assignment.assignedBy,
    dueDate: assignment.dueDate?.toISOString(),
    status: assignment.status.toLowerCase(),
    notes: assignment.notes,
    createdAt: assignment.createdAt.toISOString(),
    activeRunId: activeRun?.id,
  };
}
