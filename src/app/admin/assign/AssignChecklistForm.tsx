"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { useApp } from "@/context/AppContext";
import { categoryLabel } from "@/lib/utils";

const shiftNotes = [
  { label: "Opening shift", value: "Opening shift — complete before service." },
  { label: "Lunch line", value: "Lunch service line check." },
  { label: "Dinner line", value: "Dinner service line check." },
  { label: "Closing shift", value: "Closing shift — complete before leaving." },
];

export default function AssignChecklistForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { getAllTemplates, getEmployees, createAssignment } = useApp();
  const templates = getAllTemplates();
  const employees = getEmployees();

  const preselectedEmail = searchParams.get("employee") ?? "";

  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [assignedToEmail, setAssignedToEmail] = useState(
    preselectedEmail || employees[0]?.email || ""
  );
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Template and crew lists load asynchronously — keep the selected ids
  // pointing at real entries once data arrives, or stale ids get submitted.
  useEffect(() => {
    if (templates.length > 0 && !templates.some((t) => t.id === templateId)) {
      setTemplateId(templates[0].id);
    }
  }, [templates, templateId]);

  useEffect(() => {
    if (employees.length === 0) return;
    if (preselectedEmail && employees.some((e) => e.email === preselectedEmail)) {
      setAssignedToEmail(preselectedEmail);
      return;
    }
    if (!employees.some((e) => e.email === assignedToEmail)) {
      setAssignedToEmail(employees[0].email);
    }
  }, [employees, preselectedEmail, assignedToEmail]);

  const selectedTemplate = templates.find((t) => t.id === templateId);
  const selectedEmployee = employees.find((e) => e.email === assignedToEmail);
  const listsReady = templates.length > 0 && employees.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await createAssignment({
        templateId,
        assignedToEmail,
        dueDate: dueDate || undefined,
        notes: notes || undefined,
      });
      router.push("/admin/assignments");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not create the assignment."
      );
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="Kitchen Manager"
        title="Assign Kitchen Audit"
        description="Connect a crew member to a compliance checklist with a due date and shift notes."
        backHref="/admin"
        backLabel="Dashboard"
      />

      <form onSubmit={handleSubmit} className="glass-panel max-w-2xl space-y-5 p-6">
        <div>
          <label className="field-label" htmlFor="template">
            Audit checklist
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
                {t.name} ({categoryLabel(t.category)})
              </option>
            ))}
          </select>
          {selectedTemplate && (
            <p className="mt-2 text-sm text-slate-500">{selectedTemplate.description}</p>
          )}
        </div>

        <div>
          <label className="field-label" htmlFor="employee">
            Assign to crew member
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
                {e.name}
                {e.jobTitle ? ` — ${e.jobTitle}` : ""} ({e.email})
              </option>
            ))}
          </select>
          {selectedEmployee && (
            <p className="mt-2 text-xs text-slate-500">{selectedEmployee.locationName}</p>
          )}
        </div>

        <div>
          <label className="field-label" htmlFor="dueDate">
            Due date
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
          <label className="field-label">Quick shift notes</label>
          <div className="mb-2 flex flex-wrap gap-2">
            {shiftNotes.map((shift) => (
              <button
                key={shift.label}
                type="button"
                onClick={() => setNotes(shift.value)}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-brand-50 hover:text-brand-700"
              >
                {shift.label}
              </button>
            ))}
          </div>
          <textarea
            id="notes"
            className="field-input min-h-[96px]"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Complete before lunch rush — walk-in cooler priority"
          />
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="btn-primary"
          disabled={submitting || !listsReady}
        >
          {!listsReady
            ? "Loading..."
            : submitting
              ? "Assigning..."
              : "Assign Audit to Crew Member"}
        </button>
      </form>
    </AppShell>
  );
}
