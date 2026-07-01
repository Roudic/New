"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ChecklistBuilder } from "@/components/ChecklistBuilder";
import { PageHeader } from "@/components/PageHeader";
import type { ChecklistDraft, ChecklistTemplate } from "@/lib/types";

export default function EditChecklistPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [template, setTemplate] = useState<ChecklistTemplate | null>(null);

  useEffect(() => {
    fetch(`/api/checklists/${params.id}`)
      .then((r) => r.json())
      .then(setTemplate)
      .catch(() => setTemplate(null));
  }, [params.id]);

  if (!template) {
    return (
      <AppShell>
        <PageHeader title="Loading..." backHref="/checklists" backLabel="Back" />
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
        backLabel="Back"
      />

      <ChecklistBuilder
        initial={template}
        submitLabel="Save Changes"
        onSave={async (draft: ChecklistDraft) => {
          await fetch(`/api/checklists/${template.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(draft),
          });
          router.push(`/checklists/${template.id}`);
        }}
        onDelete={async () => {
          if (!confirm(`Delete "${template.name}"?`)) return;
          await fetch(`/api/checklists/${template.id}`, { method: "DELETE" });
          router.push("/checklists");
        }}
      />
    </AppShell>
  );
}
