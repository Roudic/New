"use client";

import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import type {
  ChecklistCategory,
  ChecklistDraft,
  ChecklistItem,
  ChecklistSchedule,
  ChecklistTemplate,
  TaskType,
} from "@/lib/types";
import { generateId, taskTypeLabel } from "@/lib/utils";

const categories: ChecklistCategory[] = [
  "custom",
  "opening",
  "closing",
  "food_safety",
  "cleaning",
  "shift",
  "audit",
];

const schedules: ChecklistSchedule[] = ["daily", "weekly", "per_shift"];

const taskTypes: TaskType[] = [
  "checkbox",
  "yes_no",
  "temperature",
  "text",
  "photo",
  "number",
];

const emptyItem = (): ChecklistItem => ({
  id: generateId(),
  title: "",
  type: "checkbox",
  required: true,
});

interface ChecklistBuilderProps {
  initial?: ChecklistTemplate;
  onSave: (draft: ChecklistDraft) => void;
  onDelete?: () => void;
  submitLabel?: string;
}

export function ChecklistBuilder({
  initial,
  onSave,
  onDelete,
  submitLabel = "Save Checklist",
}: ChecklistBuilderProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category, setCategory] = useState<ChecklistCategory>(
    initial?.category ?? "custom"
  );
  const [schedule, setSchedule] = useState<ChecklistSchedule>(
    initial?.schedule ?? "daily"
  );
  const [estimatedMinutes, setEstimatedMinutes] = useState(
    initial?.estimatedMinutes ?? 15
  );
  const [items, setItems] = useState<ChecklistItem[]>(
    initial?.items.length ? initial.items : [emptyItem()]
  );
  const [error, setError] = useState<string | null>(null);

  const updateItem = (id: string, patch: Partial<ChecklistItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const next = index + direction;
    if (next < 0 || next >= items.length) return;
    setItems((prev) => {
      const copy = [...prev];
      [copy[index], copy[next]] = [copy[next], copy[index]];
      return copy;
    });
  };

  const removeItem = (id: string) => {
    setItems((prev) =>
      prev.length === 1 ? prev : prev.filter((item) => item.id !== id)
    );
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      setError("Checklist name is required.");
      return;
    }
    if (items.some((item) => !item.title.trim())) {
      setError("Every task needs a title.");
      return;
    }

    setError(null);
    onSave({
      name: name.trim(),
      description: description.trim(),
      category,
      schedule,
      estimatedMinutes: Math.max(1, estimatedMinutes),
      items: items.map((item) => ({
        ...item,
        title: item.title.trim(),
        description: item.description?.trim() || undefined,
        trainingNote: item.trainingNote?.trim() || undefined,
      })),
    });
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6">
        <h2 className="section-title">Checklist Details</h2>
        <p className="mt-1 text-sm text-slate-500">
          Name your checklist and set how often your team should run it.
        </p>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="field-label" htmlFor="name">
              Checklist name
            </label>
            <input
              id="name"
              className="field-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Back of House Closing"
            />
          </div>

          <div className="md:col-span-2">
            <label className="field-label" htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              className="field-input min-h-[96px] resize-y"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this checklist for? Who should complete it?"
            />
          </div>

          <div>
            <label className="field-label" htmlFor="category">
              Category
            </label>
            <select
              id="category"
              className="field-input"
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as ChecklistCategory)
              }
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="field-label" htmlFor="schedule">
              Schedule
            </label>
            <select
              id="schedule"
              className="field-input"
              value={schedule}
              onChange={(e) =>
                setSchedule(e.target.value as ChecklistSchedule)
              }
            >
              {schedules.map((s) => (
                <option key={s} value={s}>
                  {s.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="field-label" htmlFor="minutes">
              Estimated time (minutes)
            </label>
            <input
              id="minutes"
              type="number"
              min={1}
              className="field-input"
              value={estimatedMinutes}
              onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      <div className="glass-panel p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="section-title">Tasks</h2>
            <p className="mt-1 text-sm text-slate-500">
              Add steps with checkboxes, photos, temperatures, and more.
            </p>
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setItems((prev) => [...prev, emptyItem()])}
          >
            <Plus className="h-4 w-4" />
            Add Task
          </button>
        </div>

        <div className="mt-6 space-y-4">
          {items.map((item, index) => (
            <div
              key={item.id}
              className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <GripVertical className="h-4 w-4 text-slate-400" />
                  Task {index + 1}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-slate-800"
                    onClick={() => moveItem(index, -1)}
                    aria-label="Move up"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-slate-800"
                    onClick={() => moveItem(index, 1)}
                    aria-label="Move down"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="rounded-lg p-2 text-rose-500 hover:bg-rose-50"
                    onClick={() => removeItem(item.id)}
                    aria-label="Remove task"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="field-label">Task title</label>
                  <input
                    className="field-input"
                    value={item.title}
                    onChange={(e) =>
                      updateItem(item.id, { title: e.target.value })
                    }
                    placeholder="e.g. Sanitize prep surfaces"
                  />
                </div>

                <div>
                  <label className="field-label">Task type</label>
                  <select
                    className="field-input"
                    value={item.type}
                    onChange={(e) =>
                      updateItem(item.id, { type: e.target.value as TaskType })
                    }
                  >
                    {taskTypes.map((type) => (
                      <option key={type} value={type}>
                        {taskTypeLabel(type)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={item.required}
                      onChange={(e) =>
                        updateItem(item.id, { required: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-slate-300 text-brand-600"
                    />
                    Required task
                  </label>
                </div>

                <div className="md:col-span-2">
                  <label className="field-label">Instructions (optional)</label>
                  <input
                    className="field-input"
                    value={item.description ?? ""}
                    onChange={(e) =>
                      updateItem(item.id, { description: e.target.value })
                    }
                    placeholder="Short guidance shown to the person completing this task"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="field-label">Training note (optional)</label>
                  <input
                    className="field-input"
                    value={item.trainingNote ?? ""}
                    onChange={(e) =>
                      updateItem(item.id, { trainingNote: e.target.value })
                    }
                    placeholder="Brand standard or compliance reminder"
                  />
                </div>

                {item.type === "temperature" && (
                  <>
                    <div>
                      <label className="field-label">Min temp (°F)</label>
                      <input
                        type="number"
                        className="field-input"
                        value={item.minTemp ?? ""}
                        onChange={(e) =>
                          updateItem(item.id, {
                            minTemp: e.target.value
                              ? Number(e.target.value)
                              : undefined,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="field-label">Max temp (°F)</label>
                      <input
                        type="number"
                        className="field-input"
                        value={item.maxTemp ?? ""}
                        onChange={(e) =>
                          updateItem(item.id, {
                            maxTemp: e.target.value
                              ? Number(e.target.value)
                              : undefined,
                          })
                        }
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn-primary" onClick={handleSubmit}>
            {submitLabel}
          </button>
        </div>
        {onDelete && (
          <button type="button" className="btn-danger" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
            Delete Checklist
          </button>
        )}
      </div>
    </div>
  );
}
