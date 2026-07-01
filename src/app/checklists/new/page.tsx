"use client";

import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ChecklistBuilder } from "@/components/ChecklistBuilder";
import { PageHeader } from "@/components/PageHeader";
import { useApp } from "@/context/AppContext";
import type { ChecklistDraft } from "@/lib/types";

export default function NewChecklistPage() {
  const router = useRouter();
  const { settings, createChecklist } = useApp();

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
        eyebrow="Checklist Builder"
        title="Create Checklist"
        description="Build a custom checklist your team can be assigned to."
        backHref="/checklists"
        backLabel="All checklists"
      />

      <ChecklistBuilder
        submitLabel="Create Checklist"
        onSave={async (draft: ChecklistDraft) => {
          const checklist = await createChecklist(draft);
          router.push(`/checklists/${checklist.id}`);
        }}
      />
    </AppShell>
  );
}
