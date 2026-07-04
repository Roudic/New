"use client";

import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ChecklistBuilder } from "@/components/ChecklistBuilder";
import { PageHeader } from "@/components/PageHeader";
import { useApp } from "@/context/AppContext";
import type { ChecklistDraft } from "@/lib/types";

export default function EditChecklistPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const { settings, getTemplateById, updateChecklist, deleteChecklist } = useApp();
  const template = getTemplateById(params.id);

  if (!template) {
    return (
      <AppShell>
        <PageHeader title="Loading..." backHref="/checklists" backLabel="Back" />
      </AppShell>
    );
  }

  if (settings.role !== "ADMIN") {
    return (
      <AppShell>
        <PageHeader title="Admin access required" backHref="/employee" backLabel="Back" />
      </AppShell>
    );
  }

  if (!template.isCustom) {
    return (
      <AppShell>
        <PageHeader
          title="Built-in templates can't be edited"
          backHref={`/checklists/${template.id}`}
          backLabel="Back"
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Checklist Builder"
        title={`Edit ${template.name}`}
        backHref={`/checklists/${template.id}`}
        backLabel="Checklist details"
      />

      <ChecklistBuilder
        initial={template}
        submitLabel="Save Changes"
        onSave={async (draft: ChecklistDraft) => {
          await updateChecklist(template.id, draft);
          router.push(`/checklists/${template.id}`);
        }}
        onDelete={async () => {
          await deleteChecklist(template.id);
          router.push("/checklists");
        }}
      />
    </AppShell>
  );
}
