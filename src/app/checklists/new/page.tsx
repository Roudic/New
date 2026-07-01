"use client";

import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ChecklistBuilder } from "@/components/ChecklistBuilder";
import { PageHeader } from "@/components/PageHeader";
import { useApp } from "@/context/AppContext";

export default function NewChecklistPage() {
  const router = useRouter();
  const { createChecklist } = useApp();

  return (
    <AppShell>
      <PageHeader
        eyebrow="Checklist Builder"
        title="Create Your Checklist"
        description="Build a custom operational checklist with the task types your team needs — photo proof, temperatures, yes/no, notes, and more."
        backHref="/checklists"
        backLabel="All checklists"
      />

      <ChecklistBuilder
        submitLabel="Create Checklist"
        onSave={(draft) => {
          const checklist = createChecklist(draft);
          router.push(`/checklists/${checklist.id}`);
        }}
      />
    </AppShell>
  );
}
