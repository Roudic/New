"use client";

import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ChecklistBuilder } from "@/components/ChecklistBuilder";
import { PageHeader } from "@/components/PageHeader";
import { useApp } from "@/context/AppContext";

export default function EditChecklistPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const { getTemplateById, updateChecklist, deleteChecklist } = useApp();
  const template = getTemplateById(params.id);

  if (!template) {
    return (
      <AppShell>
        <PageHeader
          title="Checklist not found"
          backHref="/checklists"
          backLabel="All checklists"
        />
      </AppShell>
    );
  }

  if (!template.isCustom) {
    return (
      <AppShell>
        <PageHeader
          title="Built-in templates can't be edited"
          description="Duplicate this checklist by creating your own version with the builder."
          backHref={`/checklists/${template.id}`}
          backLabel="Back to checklist"
          action={
            <button
              type="button"
              className="btn-primary"
              onClick={() => router.push("/checklists/new")}
            >
              Create Custom Checklist
            </button>
          }
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Checklist Builder"
        title={`Edit ${template.name}`}
        description="Update tasks, instructions, schedule, and requirements for your team."
        backHref={`/checklists/${template.id}`}
        backLabel="Back to checklist"
      />

      <ChecklistBuilder
        initial={template}
        submitLabel="Save Changes"
        onSave={(draft) => {
          updateChecklist(template.id, draft);
          router.push(`/checklists/${template.id}`);
        }}
        onDelete={() => {
          if (
            confirm(
              `Delete "${template.name}"? This cannot be undone. Completed runs will stay in history.`
            )
          ) {
            deleteChecklist(template.id);
            router.push("/checklists");
          }
        }}
      />
    </AppShell>
  );
}
