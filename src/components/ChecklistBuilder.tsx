"use client";

import { ChevronDown, ChevronUp, ClipboardPaste, Plus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { useApp } from "@/context/AppContext";
import type {
  ChecklistCategory,
  ChecklistDraft,
  ChecklistItem,
  ChecklistSchedule,
  ChecklistTemplate,
  TaskType,
} from "@/lib/types";
import { categoryLabel, generateId, scheduleLabel, taskTypeLabel } from "@/lib/utils";

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

const emptyItem = (title = ""): ChecklistItem => ({
  id: generateId(),
  title,
  type: "checkbox",
  required: true,
});

function cloneItems(items: ChecklistItem[]): ChecklistItem[] {
  return items.map((item) => ({ ...item, id: generateId() }));
}

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
  const { getAllTemplates } = useApp();
  const starters = getAllTemplates();
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category, setCategory] = useState<ChecklistCategory>(initial?.category ?? "custom");
  const [schedule, setSchedule] = useState<ChecklistSchedule>(initial?.schedule ?? "daily");
  const [estimatedMinutes, setEstimatedMinutes] = useState(initial?.estimatedMinutes ?? 15);
  const [items, setItems] = useState<ChecklistItem[]>(initial?.items.length ? initial.items : []);
  const [quickTitle, setQuickTitle] = useState("");
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [moreOpen, setMoreOpen] = useState(Boolean(initial?.description));
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [starterId, setStarterId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const quickRef = useRef<HTMLInputElement>(null);

  const addTitles = (titles: string[]) => {
    const clean = titles.map((title) => title.trim()).filter(Boolean);
    if (!clean.length) return;
    setItems((prev) => [...prev, ...clean.map((title) => emptyItem(title))]);
  };

  const addQuickTask = () => {
    const title = quickTitle.trim();
    if (!title) return;
    addTitles([title]);
    setQuickTitle("");
    quickRef.current?.focus();
  };

  const updateItem = (id: string, patch: Partial<ChecklistItem>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
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

  const applyStarter = () => {
    const source = starters.find((template) => template.id === starterId);
    if (!source) return;
    setItems((prev) => [...prev, ...cloneItems(source.items)]);
    if (!name.trim()) setName(`${source.name} (custom)`);
    if (!description.trim()) setDescription(source.description);
    setCategory(source.category);
    setSchedule(source.schedule);
    setEstimatedMinutes(source.estimatedMinutes);
    setStarterId("");
  };

  const applyPaste = () => {
    addTitles(pasteText.split(/\n/));
    setPasteText("");
    setPasteOpen(false);
    quickRef.current?.focus();
  };

  const handleSubmit = () => {
    const named = items.filter((item) => item.title.trim());
    if (!name.trim()) {
      setError("Give the checklist a name.");
      return;
    }
    if (!named.length) {
      setError("Add at least one task. Type it and press Enter.");
      return;
    }

    setError(null);
    onSave({
      name: name.trim(),
      description: description.trim(),
      category,
      schedule,
      estimatedMinutes: Math.max(1, estimatedMinutes),
      items: named.map((item) => ({
        ...item,
        title: item.title.trim(),
        description: item.description?.trim() || undefined,
        trainingNote: item.trainingNote?.trim() || undefined,
      })),
    });
  };

  return (
    <div className="space-y-5">
      <div className="glass-panel p-5">
        <label className="field-label" htmlFor="name">
          Checklist name
        </label>
        <input
          id="name"
          className="field-input text-lg font-semibold"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Closing — front counter"
          autoFocus={!initial}
        />

        <button
          type="button"
          className="mt-4 text-sm font-semibold text-brand-700"
          onClick={() => setMoreOpen((open) => !open)}
        >
          {moreOpen ? "Hide extra details" : "Category, schedule, notes"}
        </button>
        {moreOpen && (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="field-label" htmlFor="description">
                Notes (optional)
              </label>
              <textarea
                id="description"
                className="field-input min-h-[72px] resize-y"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Who runs this and when"
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
                onChange={(e) => setCategory(e.target.value as ChecklistCategory)}
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {categoryLabel(cat)}
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
                onChange={(e) => setSchedule(e.target.value as ChecklistSchedule)}
              >
                {schedules.map((value) => (
                  <option key={value} value={value}>
                    {scheduleLabel(value)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="minutes">
                Minutes
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
        )}
      </div>

      <div className="glass-panel p-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="section-title">Tasks</h2>
            <p className="mt-1 text-sm text-slate-500">
              Type a task and press Enter. {items.length} added.
            </p>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <input
            ref={quickRef}
            className="field-input"
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addQuickTask();
              }
            }}
            placeholder="Walk-in temp, wipe tables, …"
            aria-label="New task"
          />
          <button type="button" className="btn-primary shrink-0" onClick={addQuickTask}>
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-secondary py-2 text-sm"
            onClick={() => setPasteOpen((open) => !open)}
          >
            <ClipboardPaste className="h-4 w-4" />
            Paste a list
          </button>
          {starters.length > 0 && (
            <div className="flex min-w-0 flex-1 gap-2">
              <select
                className="field-input py-2"
                value={starterId}
                onChange={(e) => setStarterId(e.target.value)}
                aria-label="Start from a built-in checklist"
              >
                <option value="">Copy tasks from a built-in…</option>
                {starters.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} ({template.items.length})
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn-secondary shrink-0 py-2 text-sm"
                onClick={applyStarter}
                disabled={!starterId}
              >
                Use
              </button>
            </div>
          )}
        </div>

        {pasteOpen && (
          <div className="mt-3">
            <textarea
              className="field-input min-h-[120px] resize-y"
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={"One task per line\nSanitize boards\nCheck fryer oil\nLock back door"}
            />
            <button type="button" className="btn-primary mt-2" onClick={applyPaste}>
              Add these tasks
            </button>
          </div>
        )}

        <ul className="mt-5 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {items.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-slate-500">
              No tasks yet. Type one above and press Enter.
            </li>
          )}
          {items.map((item, index) => {
            const open = expandedId === item.id;
            return (
              <li key={item.id} className="px-3 py-2.5 sm:px-4">
                <div className="flex items-center gap-2">
                  <span className="w-6 shrink-0 text-center text-xs font-bold text-slate-400">
                    {index + 1}
                  </span>
                  <input
                    className="field-input py-2"
                    value={item.title}
                    onChange={(e) => updateItem(item.id, { title: e.target.value })}
                    placeholder="Task title"
                  />
                  <select
                    className="field-input hidden w-36 shrink-0 py-2 sm:block"
                    value={item.type}
                    onChange={(e) => updateItem(item.id, { type: e.target.value as TaskType })}
                    aria-label="Task type"
                  >
                    {taskTypes.map((type) => (
                      <option key={type} value={type}>
                        {taskTypeLabel(type)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                    onClick={() => setExpandedId(open ? null : item.id)}
                    aria-label={open ? "Hide task options" : "More task options"}
                  >
                    {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    className="rounded-lg p-2 text-rose-500 hover:bg-rose-50"
                    onClick={() => setItems((prev) => prev.filter((row) => row.id !== item.id))}
                    aria-label="Remove task"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {open && (
                  <div className="mt-3 grid gap-3 pl-8 sm:grid-cols-2">
                    <div className="sm:hidden">
                      <label className="field-label">Type</label>
                      <select
                        className="field-input"
                        value={item.type}
                        onChange={(e) => updateItem(item.id, { type: e.target.value as TaskType })}
                      >
                        {taskTypes.map((type) => (
                          <option key={type} value={type}>
                            {taskTypeLabel(type)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={item.required}
                        onChange={(e) => updateItem(item.id, { required: e.target.checked })}
                        className="h-4 w-4 rounded border-slate-300 text-brand-600"
                      />
                      Required
                    </label>
                    <div className="sm:col-span-2">
                      <label className="field-label">Instructions (optional)</label>
                      <input
                        className="field-input"
                        value={item.description ?? ""}
                        onChange={(e) => updateItem(item.id, { description: e.target.value })}
                        placeholder="Shown while they do the task"
                      />
                    </div>
                    {item.type === "temperature" && (
                      <>
                        <div>
                          <label className="field-label">Min °F</label>
                          <input
                            type="number"
                            className="field-input"
                            value={item.minTemp ?? ""}
                            onChange={(e) =>
                              updateItem(item.id, {
                                minTemp: e.target.value ? Number(e.target.value) : undefined,
                              })
                            }
                          />
                        </div>
                        <div>
                          <label className="field-label">Max °F</label>
                          <input
                            type="number"
                            className="field-input"
                            value={item.maxTemp ?? ""}
                            onChange={(e) =>
                              updateItem(item.id, {
                                maxTemp: e.target.value ? Number(e.target.value) : undefined,
                              })
                            }
                          />
                        </div>
                      </>
                    )}
                    <div className="flex gap-2 sm:col-span-2">
                      <button
                        type="button"
                        className="btn-secondary py-2 text-sm"
                        onClick={() => moveItem(index, -1)}
                        disabled={index === 0}
                      >
                        Move up
                      </button>
                      <button
                        type="button"
                        className="btn-secondary py-2 text-sm"
                        onClick={() => moveItem(index, 1)}
                        disabled={index === items.length - 1}
                      >
                        Move down
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" className="btn-primary" onClick={handleSubmit}>
          {submitLabel}
        </button>
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
