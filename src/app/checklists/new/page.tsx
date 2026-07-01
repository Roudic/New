"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AppShell } from "@/components/AppShell";
import { ChecklistBuilder } from "@/components/ChecklistBuilder";
import { PageHeader } from "@/components/PageHeader";
import type { ChecklistDraft } from "@/lib/types";

export default function NewChecklistPage() {
  const router = useRouter();
  const { data: session } = useSession();

  if (session?.user.role !== "ADMIN") {
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
          const res = await fetch("/api/checklists", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(draft),
          });
          const checklist = await res.json();
          router.push(`/checklists/${checklist.id}`);
        }}
      />
    </AppShell>
  );
}
