"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { ChecklistBuilder } from "@/components/ChecklistBuilder";
import { PageHeader } from "@/components/PageHeader";
import { useApp } from "@/context/AppContext";
import type { ChecklistDraft, ChecklistTemplate } from "@/lib/types";
import { generateId } from "@/lib/utils";

function NewChecklistForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { settings, createChecklist, getTemplateById } = useApp();
  const fromId = searchParams.get("from");
  const source = fromId ? getTemplateById(fromId) : undefined;
  const initial: ChecklistTemplate | undefined = source
    ? {
        ...source,
        id: `draft-${generateId()}`,
        name: source.isCustom ? source.name : `${source.name} (custom)`,
        items: source.items.map((item) => ({ ...item, id: generateId() })),
        isCustom: true,
      }
    : undefined;

  if (settings.role !== "ADMIN") {
    return (
      <AppShell>
        <PageHeader title="Admin access required" backHref="/employee" backLabel="Back" />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="New audit"
        title="Create checklist"
        description="Name it, type each task, press Enter. That’s the whole list."
        backHref="/checklists"
        backLabel="All checklists"
      />

      <ChecklistBuilder
        initial={initial}
        submitLabel="Save checklist"
        onSave={async (draft: ChecklistDraft) => {
          const checklist = await createChecklist(draft);
          router.push(`/checklists/${checklist.id}`);
        }}
      />
    </AppShell>
  );
}

export default function NewChecklistPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <PageHeader title="Create checklist" backHref="/checklists" backLabel="Back" />
        </AppShell>
      }
    >
      <NewChecklistForm />
    </Suspense>
  );
}
