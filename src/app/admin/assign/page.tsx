"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";

interface Employee {
  id: string;
  name: string;
  email: string;
}

interface Template {
  id: string;
  name: string;
}

export default function AssignChecklistPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [assignedToId, setAssignedToId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/users").then((r) => r.json()),
      fetch("/api/checklists").then((r) => r.json()),
    ]).then(([users, checklistData]) => {
      setEmployees(users);
      setTemplates(checklistData);
      if (checklistData[0]) setTemplateId(checklistData[0].id);
      if (users[0]) setAssignedToId(users[0].id);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const res = await fetch("/api/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        templateId,
        assignedToId,
        dueDate: dueDate || null,
        notes,
      }),
    });

    setSaving(false);

    if (!res.ok) {
      setError("Could not create assignment.");
      return;
    }

    router.push("/admin");
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="Admin"
        title="Assign Checklist"
        description="Choose a checklist and assign it to a team member with an optional due date."
        backHref="/admin"
        backLabel="Dashboard"
      />

      <form onSubmit={handleSubmit} className="glass-panel max-w-2xl space-y-5 p-6">
        <div>
          <label className="field-label" htmlFor="template">
            Checklist
          </label>
          <select
            id="template"
            className="field-input"
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            required
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="field-label" htmlFor="employee">
            Assign to
          </label>
          <select
            id="employee"
            className="field-input"
            value={assignedToId}
            onChange={(e) => setAssignedToId(e.target.value)}
            required
          >
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} ({e.email})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="field-label" htmlFor="dueDate">
            Due date (optional)
          </label>
          <input
            id="dueDate"
            type="date"
            className="field-input"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>

        <div>
          <label className="field-label" htmlFor="notes">
            Notes for employee
          </label>
          <textarea
            id="notes"
            className="field-input min-h-[96px]"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any special instructions..."
          />
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Assigning..." : "Assign Checklist"}
        </button>
      </form>
    </AppShell>
  );
}
