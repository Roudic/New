"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { useApp } from "@/context/AppContext";

export default function AssignChecklistPage() {
  const router = useRouter();
  const { getAllTemplates, getEmployees, createAssignment } = useApp();
  const templates = getAllTemplates();
  const employees = getEmployees();

  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [assignedToEmail, setAssignedToEmail] = useState(employees[0]?.email ?? "");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createAssignment({
      templateId,
      assignedToEmail,
      dueDate: dueDate || undefined,
      notes: notes || undefined,
    });
    router.push("/admin");
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="Admin"
        title="Assign Checklist"
        description="Assign a checklist to a team member."
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
            value={assignedToEmail}
            onChange={(e) => setAssignedToEmail(e.target.value)}
            required
          >
            {employees.map((e) => (
              <option key={e.email} value={e.email}>
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
            Notes
          </label>
          <textarea
            id="notes"
            className="field-input min-h-[96px]"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <button type="submit" className="btn-primary">
          Assign Checklist
        </button>
      </form>
    </AppShell>
  );
}
